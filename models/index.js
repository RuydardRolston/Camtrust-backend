import User from './userModel.js';
import Project from './projectModel.js';
import Milestone from './milestoneModel.js';
import SiteEvidence from './siteEvidenceModel.js';
import ProgressReport from './progressReportModel.js';
import Document from './documentModel.js';
import Verification from './verificationModel.js';
import VerificationDocument from './verificationDocumentModel.js';
import Notification from './notificationModel.js';
import ProjectAssignment from './projectAssignmentModel.js';

User.hasMany(Project, { foreignKey: 'ownerId', as: 'ownedProjects' });
Project.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

Project.hasMany(Milestone, { foreignKey: 'projectId', as: 'milestones', onDelete: 'CASCADE' });
Milestone.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

Milestone.hasMany(SiteEvidence, { foreignKey: 'milestoneId', as: 'evidence', onDelete: 'CASCADE' });
SiteEvidence.belongsTo(Milestone, { foreignKey: 'milestoneId', as: 'milestone' });

User.hasMany(SiteEvidence, { foreignKey: 'professionalId', as: 'submittedEvidence' });
SiteEvidence.belongsTo(User, { foreignKey: 'professionalId', as: 'professional' });

Project.hasMany(ProgressReport, { foreignKey: 'projectId', as: 'reports', onDelete: 'CASCADE' });
ProgressReport.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

User.hasMany(ProgressReport, { foreignKey: 'professionalId', as: 'submittedReports' });
ProgressReport.belongsTo(User, { foreignKey: 'professionalId', as: 'professional' });

Project.hasMany(Document, { foreignKey: 'projectId', as: 'documents', onDelete: 'CASCADE' });
Document.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

User.hasMany(Document, { foreignKey: 'uploadedByUserId', as: 'uploadedDocuments' });
Document.belongsTo(User, { foreignKey: 'uploadedByUserId', as: 'uploadedBy' });

User.hasMany(Verification, { foreignKey: 'administratorId', as: 'adminVerifications' });
Verification.belongsTo(User, { foreignKey: 'administratorId', as: 'administrator' });

User.hasMany(Verification, { foreignKey: 'professionalId', as: 'verificationRequests' });
Verification.belongsTo(User, { foreignKey: 'professionalId', as: 'professional' });

Verification.hasMany(VerificationDocument, { foreignKey: 'verificationId', as: 'documents', onDelete: 'CASCADE' });
VerificationDocument.belongsTo(Verification, { foreignKey: 'verificationId', as: 'verification' });

User.hasMany(VerificationDocument, { foreignKey: 'userId', as: 'verificationDocuments' });
VerificationDocument.belongsTo(User, { foreignKey: 'userId', as: 'uploader' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Project.hasMany(ProjectAssignment, { foreignKey: 'projectId', as: 'assignments', onDelete: 'CASCADE' });
ProjectAssignment.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

User.hasMany(ProjectAssignment, { foreignKey: 'professionalId', as: 'projectAssignments' });
ProjectAssignment.belongsTo(User, { foreignKey: 'professionalId', as: 'professional' });
