/**
 * サービスレイヤーのエクスポート
 * 
 * UI層からサービスへのアクセスを一元化
 */

export { GoalService, goalService } from './goalService';
export type { CreateGoalParams, UpdateGoalParams } from './goalService';

export { PracticeService, practiceService } from './practiceService';
export type { CreatePracticeParams } from './practiceService';

export { OrganizationService, organizationService } from './organizationService';
export type { CreateOrganizationResult } from './organizationService';

export { MembershipService, membershipService } from './membershipService';

export { ScheduleService, scheduleService } from './scheduleService';
export { AttendanceService, attendanceService } from './attendanceService';
export { TaskService, taskService } from './taskService';

export { InstrumentService, instrumentService } from './instrumentService';
export type { Instrument } from './instrumentService';
export type { Instrument as InstrumentType } from './instrumentService';

export { safeServiceExecute, ServiceError } from './baseService';
export type { ServiceResult } from './baseService';
export type { ValidationResult, Validator } from './baseService';
export type { ServiceResult as ServiceResultType } from './baseService';

export { UserSettingsService, userSettingsService } from './userSettingsService';
export { TutorialService, tutorialService } from './tutorialService';

