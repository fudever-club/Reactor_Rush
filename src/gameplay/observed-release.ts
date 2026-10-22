import type { PlayerId } from './core.ts';
import type { CameraMetrics } from '../adapters/mediapipe-hand-input-adapter.ts';
import type { DetectedHand } from '../adapters/hand-input-mapper.ts';
import { extractPoseMetrics, type DetectedPose } from '../adapters/pose-input-mapper.ts';
interface Point { x:number; y:number; visibility?:number; presence?:number }
export interface ReleaseObservation {
 player:PlayerId; scheme:'H0'|'P1'|'P2'; solo:boolean; metrics:CameraMetrics;
 poses?:readonly DetectedPose[]; hands?:readonly DetectedHand[];
}
const visible=(point:Point|undefined):point is Point=>Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y)
 && (point.visibility===undefined || Number.isFinite(point.visibility)&&point.visibility>=.35)
 && (point.presence===undefined || Number.isFinite(point.presence)&&point.presence>=.35));
/** Positive release evidence only. Safety-neutral adapter output is never a release. */
export function hasObservedCameraRelease({player,scheme,solo,metrics,poses=[],hands=[]}:ReleaseObservation):boolean {
 if(solo&&player==='p2'||metrics.waitingForHand||metrics.poseCalibration?.pendingAction==='calibrate'||metrics.poseCalibration?.state==='collecting'||metrics.ambiguityReason)return false;
 if(scheme==='H0'){
  if(metrics.recalibrationRequired)return false;
  const zone=metrics.handMovementZones?.find(zone=>zone.player===player);
  if(!zone||!Number.isFinite(zone.currentX)||zone.catch||hands.length>(solo?1:2))return false;
  const assigned=hands.filter(hand=>visible(hand.landmarks[0])&&Math.abs(1-hand.landmarks[0].x-zone.currentX!)<.00001);
  if(assigned.length!==1)return false;
  const points=assigned[0].landmarks;
  if(![4,8,5,17].every(index=>visible(points[index])))return false;
  const palmWidth=Math.hypot(points[5].x-points[17].x,points[5].y-points[17].y);
  // The existing Hand mapper releases a held pinch only above its default .43 ratio.
  return palmWidth>=.015 && Math.hypot(points[4].x-points[8].x,points[4].y-points[8].y)/palmWidth>.43;
 }
 const accepted=metrics.playerStates?.[player];
 if(!accepted||!['ACCEPTED_IDLE','MOVE_LEFT','MOVE_RIGHT'].includes(accepted)||poses.length<1||poses.length>(solo?1:2))return false;
 // Match the mapper's per-player valid-torso filter; a bad other slot cannot veto an accepted player.
 const measured=poses.map(pose=>({pose,view:extractPoseMetrics(pose)})).filter(({view})=>view.isValid);
 const slot=({view}:{view:ReturnType<typeof extractPoseMetrics>})=>solo?'p1':view.screenTorsoX<.465?'p1':view.screenTorsoX>.535?'p2':null;
 if(!solo&&(measured.some(pose=>slot(pose)===null)||measured.filter(pose=>slot(pose)==='p1').length>1||measured.filter(pose=>slot(pose)==='p2').length>1))return false;
 const candidates=measured.filter(pose=>slot(pose)===player);
 if(candidates.length!==1)return false;
 const {pose,view}=candidates[0];
 if(![11,12,15,16].every(index=>visible(pose.landmarks[index])))return false;
 return !(scheme==='P1'?view.leftArmRaised&&view.rightArmRaised:view.leftArmRaised||view.rightArmRaised);
}
