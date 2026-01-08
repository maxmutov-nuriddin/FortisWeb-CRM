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
import ProjectDetailsModal from '../components/projects/ProjectDetailsModal';
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
   const [selectedProjectForDetails, setSelectedProjectForDetails] = useState(null);

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
      // 1. Filter by status
      let result = statusFilter === 'All' ? myProjects : myProjects.filter(p => p.status === statusFilter.toLowerCase());

      // 2. Filter out projects with NO files (Hide empty orders)
      result = result.filter(project => {
         const projectFiles = uploads.filter(file => file.orderId === project._id);
         return projectFiles.length > 0;
      });

      return result;
   }, [myProjects, statusFilter, uploads]);

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

                  return (
                     <div
                        key={project._id}
                        className="group relative flex flex-col bg-white dark:bg-dark-secondary border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:border-dark-accent/30 transition-all duration-300"
                     >


                        {/* Files Section  */}
                        <div className="flex-1 space-y-3 mb-4">
                           <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-semibold tracking-wider">
                              <span>Files ({projectFiles.length})</span>
                           </div>

                           {projectFiles.length > 0 ? (
                              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 customize-scrollbar">
                                 {projectFiles.map(file => {
                                    const ext = (file.originalName || '').split('.').pop().toLowerCase();
                                    let iconClass = 'fa-solid fa-file';
                                    let iconColor = 'text-gray-400';

                                    if (['pdf'].includes(ext)) { iconClass = 'fa-solid fa-file-pdf'; iconColor = 'text-red-500'; }
                                    else if (['jpg', 'png', 'jpeg'].includes(ext)) { iconClass = 'fa-solid fa-file-image'; iconColor = 'text-purple-500'; }
                                    else if (['doc', 'docx'].includes(ext)) { iconClass = 'fa-solid fa-file-word'; iconColor = 'text-blue-500'; }
                                    else if (['zip', 'rar'].includes(ext)) { iconClass = 'fa-solid fa-file-zipper'; iconColor = 'text-yellow-500'; }

                                    const formatDate = (dateStr) => {
                                       const date = new Date(dateStr);
                                       if (isNaN(date.getTime())) return null;
                                       return date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                                    };

                                    const uploadTime = formatDate(file.createdAt) || formatDate(file.updatedAt) || formatDate(project.createdAt) || 'N/A';

                                    return (
                                       <div
                                          key={file._id}
                                          onClick={() => handleDownload(file)}
                                          className="flex items-center p-2 rounded-lg bg-gray-50 dark:bg-dark-tertiary border border-gray-100 dark:border-gray-700 hover:border-dark-accent/50 cursor-pointer transition-all group/file relative overflow-hidden"
                                       >
                                          <i className={`${iconClass} ${iconColor} text-lg mr-2`}></i>

                                          <div className="flex-1 min-w-0 mr-1">
                                             <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{file.originalName}</p>
                                             <div className="flex items-center gap-2">
                                                <p className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(0)}KB</p>
                                                <span className="text-[10px] text-gray-400 font-bold">•</span>
                                                <p className="text-[10px] text-gray-500 font-medium" title="Upload time">
                                                   {uploadTime}
                                                </p>
                                             </div>
                                          </div>

                                          {/* File Actions */}
                                          <div className="flex flex-col gap-1 opacity-40 group-hover/file:opacity-100 transition-opacity">
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
                              <div className="text-center py-6 bg-gray-50 dark:bg-dark-tertiary rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                 <p className="text-xs text-gray-400">No files uploaded</p>
                              </div>
                           )}
                        </div>

                        {/* View Details Button */}
                        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                           <button
                              onClick={() => setSelectedProjectForDetails(project)}
                              className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-dark-tertiary dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg text-sm font-semibold transition"
                           >
                              <i className="fa-solid fa-circle-info text-blue-500"></i>
                              View Project Details
                           </button>
                        </div>

                        {/* Actions Footer (Accept) - Only if team lead & assigned */}
                        {userData?.role === 'team_lead' && project.status === 'assigned' && (
                           <div className="mt-3">
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
         <ProjectDetailsModal
            isOpen={!!selectedProjectForDetails}
            onClose={() => setSelectedProjectForDetails(null)}
            project={selectedProjectForDetails}
         />
      </div>
   );
};

export default Projects;
