/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useProjectStore } from '../store/project.store';
import { useAuthStore } from '../store/auth.store';
import { useCompanyStore } from '../store/company.store';
import { useProjectUploadStore } from '../store/project-upload.store';
import { projectUploadsApi } from '../api/project-uploads.api';
import PageLoader from '../components/loader/PageLoader';
import UniversalUploadModal from '../components/common/UniversalUploadModal';
import { useTranslation } from 'react-i18next';

const Projects = () => {
   const { t } = useTranslation();
   const { user } = useAuthStore();
   const userData = useMemo(() => user?.data?.user || user?.user || user, [user]);

   const {
      projects,
      getProjectsByCompany,
      acceptProject,
      deleteProject,
      isLoading: projectsLoading
   } = useProjectStore();

   const { selectedCompany } = useCompanyStore();
   const { uploads, getFiles, deleteFile, editFile, uploadFile, isLoading: uploadsLoading } = useProjectUploadStore();

   const [statusFilter, setStatusFilter] = useState('All');
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

   // File Replacement State
   const [replacingFileId, setReplacingFileId] = useState(null);
   const replaceInputRef = React.useRef(null);

   // Fetch projects and files on mount
   useEffect(() => {
      const companyId = userData?.company?._id || userData?.company;
      if (companyId) {
         getProjectsByCompany(companyId);
         getFiles({ companyId });
      }
   }, [userData, getProjectsByCompany, getFiles]);

   const myProjects = useMemo(() => {
      const allProjects = projects?.data?.projects || (Array.isArray(projects) ? projects : []) || [];
      const myId = String(userData?._id || userData?.id || '');
      const myRole = userData?.role;

      if (!myId) return [];

      return allProjects.filter(p => {
         // 1. Team Lead: sees projects where they are lead OR projects assign to their team
         if (myRole === 'team_lead') {
            const leadId = String(p.teamLead?._id || p.teamLead || '');
            return leadId === myId;
         }
         // 2. Regular Member: sees projects where they are in assignedMembers
         if (['frontend', 'backend', 'marketer', 'designer', 'employee'].includes(myRole)) {
            const isAssigned = p.assignedMembers?.some(m => {
               const mId = String(m.user?._id || m.user || m || '');
               return mId === myId;
            });
            return isAssigned;
         }
         // 3. Admins see all (if they access this page)
         if (['super_admin', 'company_admin'].includes(myRole)) {
            return true;
         }
         return false;
      });
   }, [projects, userData]);

   const filteredProjects = useMemo(() => {
      if (statusFilter === 'All') return myProjects;
      return myProjects.filter(p => p.status === statusFilter.toLowerCase());
   }, [myProjects, statusFilter]);

   const handleAccept = async (project) => {
      if (!window.confirm(t('confirm_accept_project'))) return;

      setIsSubmitting(true);
      try {
         await acceptProject(project._id, {
            acceptedBy: userData._id,
            note: 'Accepted via Dashboard'
         });
         toast.success(t('project_accepted_success'));
      } catch (error) {
         console.error(error);
         toast.error(error.response?.data?.message || t('failed_accept_project'));
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleDelete = async (project) => {
      if (!window.confirm(t('confirm_delete_project') || 'Are you sure you want to delete this project?')) return;

      try {
         await deleteProject(project._id);
         toast.success(t('project_deleted_success') || 'Project deleted successfully');
      } catch (error) {
         console.error(error);
         toast.error(error.response?.data?.message || t('failed_delete_project') || 'Failed to delete project');
      }
   };

   const handleDownload = async (file) => {
      try {
         const response = await projectUploadsApi.download(file._id);
         const url = window.URL.createObjectURL(new Blob([response.data]));
         const link = document.createElement('a');
         link.href = url;
         link.setAttribute('download', file.filename || file.originalName);
         document.body.appendChild(link);
         link.click();
         link.remove();
      } catch (error) {
         console.error('Download failed', error);
         toast.error('Failed to download file');
      }
   };

   const handleFileDelete = async (fileId) => {
      if (!window.confirm('Are you sure you want to delete this file?')) return;
      try {
         await deleteFile(fileId);
         toast.success('File deleted successfully');
      } catch (error) {
         toast.error('Failed to delete file');
      }
   };

   const handleStartReplace = (fileId) => {
      setReplacingFileId(fileId);
      if (replaceInputRef.current) {
         replaceInputRef.current.value = ''; // Reset input
         replaceInputRef.current.click();
      }
   };

   const handleFileReplace = async (e) => {
      const file = e.target.files[0];
      if (!file || !replacingFileId) return;

      const oldFile = uploads.find(u => u._id === replacingFileId);
      if (!oldFile) {
         toast.error('Original file not found');
         return;
      }

      // 1. Delete old file
      try {
         await deleteFile(replacingFileId);
      } catch (error) {
         console.error('Failed to delete old file during replacement', error);
         toast.error('Failed to replace file (could not remove old one)');
         return;
      }

      // 2. Upload new file with same metadata
      const formData = new FormData();
      formData.append('file', file);
      if (oldFile.companyId) formData.append('companyId', oldFile.companyId);
      if (oldFile.orderId) formData.append('orderId', oldFile.orderId);
      if (oldFile.taskId) formData.append('taskId', oldFile.taskId);
      if (oldFile.description) formData.append('description', oldFile.description);

      try {
         await uploadFile(formData);
         toast.success('File replaced successfully');
         setReplacingFileId(null);

         if (userData?.company) {
            const companyId = userData.company._id || userData.company;
            getFiles({ companyId });
         }
      } catch (error) {
         console.error(error);
         toast.error('Failed to upload new file during replacement');
      }
   };

   const getStatusStyle = (status) => {
      switch (status) {
         case 'assigned': return 'bg-blue-100 text-blue-700 border-blue-200';
         case 'in_progress': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
         case 'completed': return 'bg-green-100 text-green-700 border-green-200';
         case 'review': return 'bg-purple-100 text-purple-700 border-purple-200';
         default: return 'bg-gray-100 text-gray-700 border-gray-200';
      }
   };

   return (
      <div className="p-8 space-y-8 min-h-screen bg-gray-50 dark:bg-dark-primary">
         {/* Hidden File Input for Replacement */}
         <input
            type="file"
            ref={replaceInputRef}
            className="hidden"
            onChange={handleFileReplace}
         />

         {/* Header */}
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
               <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('my_projects')}</h1>
               <p className="text-gray-500 dark:text-gray-400">{t('manage_active_assignments')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
               <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="bg-dark-accent hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition flex items-center shadow-lg shadow-blue-500/20 transform hover:-translate-y-0.5"
               >
                  <i className="fa-solid fa-cloud-arrow-up mr-2"></i>
                  Upload File
               </button>
               <select
                  className="bg-white dark:bg-dark-secondary border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-dark-accent/50 shadow-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
               >
                  <option value="All">{t('all_statuses')}</option>
                  <option value="assigned">{t('assigned_new')}</option>
                  <option value="in_progress">{t('in_progress')}</option>
                  <option value="review">{t('review')}</option>
                  <option value="completed">{t('completed')}</option>
               </select>
            </div>
         </div>

         {/* Projects Grid */}
         {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {filteredProjects.map((project, index) => {
                  const projectFiles = uploads.filter(file => file.orderId === project._id);
                  const isPaid = project.statusFlags?.isPaymentAccepted;
                  const isStarted = project.statusFlags?.isWorkStarted;

                  return (
                     <div
                        key={project._id}
                        className="group relative flex flex-col bg-white dark:bg-dark-secondary border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-dark-accent/30 transition-all duration-300"
                     >
                        {/* Trash Button Absolute */}
                        {['super_admin', 'company_admin'].includes(userData?.role) && (
                           <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(project); }}
                              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Delete Project"
                           >
                              <i className="fa-solid fa-trash-can"></i>
                           </button>
                        )}

                        {/* Top Section: Client & Status */}
                        <div className="flex items-start justify-between mb-4 pr-8">
                           <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                                 {project.client?.name ? project.client.name.charAt(0).toUpperCase() : 'C'}
                              </div>
                              <div>
                                 <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {project.client?.name || 'Unknown Client'}
                                 </h3>
                                 <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'No Deadline'}
                                 </p>
                              </div>
                           </div>
                        </div>

                        {/* Title & Description */}
                        <div className="mb-5 flex-1">
                           <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusStyle(project.status)}`}>
                                 {t(project.status)}
                              </span>
                              {isPaid && <span className="text-green-500 text-xs" title="Paid"><i className="fa-solid fa-check-circle"></i></span>}
                              {isStarted && <span className="text-blue-500 text-xs" title="Started"><i className="fa-solid fa-play"></i></span>}
                           </div>
                           <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-dark-accent transition-colors">
                              {project.title}
                           </h2>
                           <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed">
                              {project.description}
                           </p>
                        </div>

                        <div className="h-px bg-gray-100 dark:bg-gray-800 mb-4 w-full"></div>

                        {/* Files Section */}
                        <div className="space-y-3">
                           <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-semibold tracking-wider">
                              <span>Attachments ({projectFiles.length})</span>
                           </div>

                           {projectFiles.length > 0 ? (
                              <div className="grid grid-cols-2 gap-2">
                                 {projectFiles.map(file => {
                                    const ext = (file.originalName || '').split('.').pop().toLowerCase();
                                    let iconClass = 'fa-solid fa-file';
                                    let iconColor = 'text-gray-400';

                                    if (['pdf'].includes(ext)) { iconClass = 'fa-solid fa-file-pdf'; iconColor = 'text-red-500'; }
                                    else if (['jpg', 'png', 'jpeg'].includes(ext)) { iconClass = 'fa-solid fa-file-image'; iconColor = 'text-purple-500'; }
                                    else if (['doc', 'docx'].includes(ext)) { iconClass = 'fa-solid fa-file-word'; iconColor = 'text-blue-500'; }
                                    else if (['zip', 'rar'].includes(ext)) { iconClass = 'fa-solid fa-file-zipper'; iconColor = 'text-yellow-500'; }

                                    return (
                                       <div
                                          key={file._id}
                                          onClick={() => handleDownload(file)}
                                          className="flex items-center p-2 rounded-lg bg-gray-50 dark:bg-dark-tertiary border border-gray-100 dark:border-gray-700 hover:border-dark-accent/50 cursor-pointer transition-all group/file relative overflow-hidden"
                                       >
                                          <i className={`${iconClass} ${iconColor} text-lg mr-2`}></i>

                                          <div className="flex-1 min-w-0 mr-1">
                                             <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{file.originalName}</p>
                                             <p className="text-[9px] text-gray-400">{(file.size / 1024).toFixed(0)}KB</p>
                                          </div>

                                          {/* File Actions (Edit/Delete) - Only visible on hover */}
                                          <div className="flex flex-col gap-1 opacity-0 group-hover/file:opacity-100 transition-opacity">
                                             <button
                                                onClick={(e) => { e.stopPropagation(); handleStartReplace(file._id); }}
                                                className="text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1 rounded transition-colors"
                                                title="Replace File"
                                             >
                                                <i className="fa-solid fa-pen text-[10px]"></i>
                                             </button>
                                             <button
                                                onClick={(e) => { e.stopPropagation(); handleFileDelete(file._id); }}
                                                className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded transition-colors"
                                                title="Delete File"
                                             >
                                                <i className="fa-solid fa-trash text-[10px]"></i>
                                             </button>
                                          </div>
                                       </div>
                                    )
                                 })}
                              </div>
                           ) : (
                              <div className="text-center py-4 bg-gray-50 dark:bg-dark-tertiary rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                 <p className="text-xs text-gray-400">No files uploaded</p>
                              </div>
                           )}
                        </div>

                        {/* Actions Footer */}
                        {userData?.role === 'team_lead' && project.status === 'assigned' && (
                           <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                              <button
                                 onClick={() => handleAccept(project)}
                                 disabled={isSubmitting}
                                 className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-semibold shadow-green-500/20 shadow-lg transition"
                              >
                                 Accept Assignment
                              </button>
                           </div>
                        )}
                     </div>
                  );
               })}
            </div>
         ) : (
            <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-dark-secondary rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm text-center">
               <div className="w-20 h-20 bg-gray-100 dark:bg-dark-tertiary rounded-full flex items-center justify-center mb-6">
                  <i className="fa-solid fa-folder-open text-4xl text-gray-400"></i>
               </div>
               <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Projects Found</h3>
               <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  There are no projects matching your current filters. Try changing the status filter or checking back later.
               </p>
            </div>
         )}

         <UniversalUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            onSuccess={() => {
               if (userData?.company) {
                  const cId = userData.company._id || userData.company;
                  getProjectsByCompany(cId);
                  getFiles({ companyId: cId });
               }
            }}
         />
      </div>
   );
};

export default Projects;
