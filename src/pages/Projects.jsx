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
      deleteRepository,
      isLoading: projectsLoading
   } = useProjectStore();

   const { selectedCompany } = useCompanyStore();
   const { uploads, getFiles, deleteFile, editFile, uploadFile, isLoading: uploadsLoading } = useProjectUploadStore();

   const [statusFilter, setStatusFilter] = useState('All');
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
   const [selectedProjectForDetails, setSelectedProjectForDetails] = useState(null);

   const [replacingFileId, setReplacingFileId] = useState(null);
   const replaceInputRef = React.useRef(null);

   useEffect(() => {
      const companyId = userData?.company?._id || userData?.company;
      if (companyId) {
         getProjectsByCompany(companyId);
         getFiles({ companyId });
      } else if (userData?.role === 'super_admin') {
         // Super Admin sees all projects/files, or explicitly passed company filter?
         // For now fetch all files implies no filter, backend handles it.
         // But wait, getProjectsByCompany also depends on ID. 
         // Super Admin usually sees ALL projects.
         // Let's assume there's a getAllProjects or similar, but here we reuse existing logic.
         // If super admin has no company, maybe we should fetch ALL files.
         getFiles({});
         // Note: getProjectsByCompany might fail if passed null? 
         // Assuming super admin handles projects separately or has a different view, 
         // but for files we definitely need to fetch them.
      }
   }, [userData, getProjectsByCompany, getFiles]);

   const myProjects = useMemo(() => {
      const allProjects = projects?.data?.projects || (Array.isArray(projects) ? projects : []) || [];

      console.log('📋 Projects Page - Full projects object:', projects);
      console.log('📋 Projects Page - Extracted projects:', allProjects);
      console.log('📋 Projects Page - Projects count:', allProjects.length);

      // Backend already filters projects based on user role and permissions
      // No need for additional frontend filtering
      return allProjects;
   }, [projects]);

   const filteredProjects = useMemo(() => {
      return statusFilter === 'All' ? myProjects : myProjects.filter(p => p.status === statusFilter.toLowerCase());
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
         replaceInputRef.current.value = '';
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

      try {
         await deleteFile(replacingFileId);
      } catch (error) {
         console.error('Failed to delete old file during replacement', error);
         toast.error('Failed to replace file (could not remove old one)');
         return;
      }

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

   const handleDeleteRepo = async (projectId) => {
      if (!window.confirm('Are you sure you want to remove this repository link?')) return;
      try {
         await deleteRepository(projectId);
         toast.success('Repository link removed');
      } catch (error) {
         console.error(error);
         toast.error('Failed to remove repository');
      }
   };

   const statusBadge = (status) => {
      switch (status) {
         case 'assigned': return 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30';
         case 'in_progress': return 'bg-yellow-50 text-yellow-600 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900/30';
         case 'review': return 'bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/30';
         case 'completed': return 'bg-green-50 text-green-600 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30';
         default: return 'bg-gray-50 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
      }
   };

   if ((projectsLoading || uploadsLoading) && myProjects?.length === 0) return <PageLoader />;

   return (
      <div className="min-h-screen p-6 lg:p-10 bg-gray-50/50 dark:bg-black text-gray-900 dark:text-white font-sans">
         <div className="max-w-[1600px] mx-auto space-y-10">
            {/* Hidden File Input */}
            <input type="file" ref={replaceInputRef} className="hidden" onChange={handleFileReplace} />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
               <div>
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">{t('my_projects')}</h1>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">{t('manage_active_assignments')}</p>
               </div>
               <div className="flex flex-wrap items-center gap-4">
                  <select
                     className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                     value={statusFilter}
                     onChange={(e) => setStatusFilter(e.target.value)}
                  >
                     <option value="All">{t('all_statuses')}</option>
                     <option value="assigned">{t('assigned_new')}</option>
                     <option value="in_progress">{t('in_progress')}</option>
                     <option value="review">{t('review')}</option>
                     <option value="completed">{t('completed')}</option>
                  </select>
                  <button
                     onClick={() => setIsUploadModalOpen(true)}
                     className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-lg shadow-red-900/20 hover:shadow-red-900/40 hover:-translate-y-0.5 flex items-center gap-2"
                  >
                     <i className="fa-solid fa-cloud-arrow-up"></i>
                     {t('upload_file_button')}
                  </button>
               </div>
            </div>

            {/* Content */}
            {filteredProjects.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProjects.map((project, index) => {
                     const projectFiles = uploads.filter(file => file.orderId === project._id);

                     return (
                        <div key={project._id} className="group bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm hover:shadow-2xl hover:border-red-500/30 dark:hover:border-red-500/30 transition-all duration-300 relative overflow-hidden flex flex-col">
                           {/* Decorative gradient blob */}
                           <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-900 rounded-bl-[100px] -mr-10 -mt-10 opacity-50 group-hover:scale-110 transition-transform duration-500"></div>

                           <div className="relative z-10 flex flex-col h-full">
                              {/* Header Card */}
                              <div className="flex justify-between items-start mb-6">
                                 <div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 inline-block ${statusBadge(project.status)}`}>
                                       {project.status.replace('_', ' ')}
                                    </span>
                                    <h3
                                       className="text-xl font-bold text-gray-900 dark:text-white leading-tight cursor-pointer hover:text-red-500 transition-colors"
                                       onClick={() => setSelectedProjectForDetails(project)}
                                    >
                                       {project.title}
                                    </h3>
                                 </div>
                                 <button
                                    onClick={() => setSelectedProjectForDetails(project)}
                                    className="w-8 h-8 rounded-full bg-gray-50 dark:bg-zinc-800 flex items-center justify-center text-gray-400 hover:text-white hover:bg-black dark:hover:bg-white dark:hover:text-black transition-all"
                                 >
                                    <i className="fa-solid fa-arrow-right -rotate-45"></i>
                                 </button>
                              </div>

                              {/* Repository Section for Workers */}
                              {['worker', 'frontend', 'backend', 'marketer', 'designer', 'employee'].includes(userData?.role) && project.repository?.url && (
                                 <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20">
                                    <div className="flex items-center justify-between mb-2 text-[10px] font-bold text-red-500 uppercase tracking-wider">
                                       <span>{t('repo_access_label')}</span>
                                       <i className="fa-solid fa-code"></i>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <div className="flex-1 min-w-0">
                                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                             {project.repository.url}
                                          </p>
                                       </div>
                                       <button
                                          onClick={(e) => {
                                             e.stopPropagation();
                                             navigator.clipboard.writeText(project.repository.url);
                                             toast.success('Link copied!');
                                          }}
                                          className="px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-bold border border-gray-200 dark:border-zinc-700 transition-colors flex items-center gap-2 shadow-sm"
                                       >
                                          <i className="fa-solid fa-copy"></i>
                                          {t('copy_button')}
                                       </button>
                                       {(project.repository.addedBy === userData?._id || ['super_admin', 'company_admin'].includes(userData?.role)) && (
                                          <button
                                             onClick={async (e) => {
                                                e.stopPropagation();
                                                handleDeleteRepo(project._id);
                                             }}
                                             className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 border border-gray-200 dark:border-zinc-700 transition-colors flex items-center justify-center shadow-sm"
                                             title="Delete"
                                          >
                                             <i className="fa-solid fa-trash-can text-[10px]"></i>
                                          </button>
                                       )}
                                    </div>
                                 </div>
                              )}

                              {/* Info Grid */}
                              <div className="grid grid-cols-2 gap-4 mb-6">
                                 <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('created')}</div>
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{new Date(project.createdAt).toLocaleDateString()}</div>
                                 </div>
                                 <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('deadline')}</div>
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{new Date(project.deadline).toLocaleDateString()}</div>
                                 </div>
                              </div>

                              {/* Files Section */}
                              <div className="flex-1 min-h-[100px]">
                                 <div className="flex items-center justify-between mb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    <span>{t('files_count_label')} ({projectFiles.length})</span>
                                    <i className="fa-solid fa-paperclip"></i>
                                 </div>

                                 <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                                    {projectFiles.length > 0 ? (
                                       projectFiles.map(file => {
                                          const ext = (file.originalName || '').split('.').pop().toLowerCase();
                                          let iconClass = 'fa-solid fa-file';
                                          let iconColor = 'text-gray-400';

                                          if (['pdf'].includes(ext)) { iconClass = 'fa-solid fa-file-pdf'; iconColor = 'text-red-500'; }
                                          else if (['jpg', 'png', 'jpeg'].includes(ext)) { iconClass = 'fa-solid fa-file-image'; iconColor = 'text-purple-500'; }
                                          else if (['doc', 'docx'].includes(ext)) { iconClass = 'fa-solid fa-file-word'; iconColor = 'text-blue-500'; }
                                          else if (['zip', 'rar'].includes(ext)) { iconClass = 'fa-solid fa-file-zipper'; iconColor = 'text-yellow-500'; }

                                          return (
                                             <div key={file._id} onClick={() => handleDownload(file)} className="flex items-center p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer group/file transition-colors border border-transparent hover:border-gray-200 dark:hover:border-zinc-700">
                                                <i className={`${iconClass} ${iconColor} text-lg mr-3`}></i>
                                                <div className="flex-1 min-w-0">
                                                   <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{file.originalName}</p>
                                                   <p className="text-[10px] text-gray-400 font-medium">{(file.size / 1024).toFixed(0)}KB</p>
                                                </div>
                                                {/* Show edit/delete buttons only for authorized users */}
                                                {(['super_admin', 'company_admin', 'company_owner', 'team_lead'].includes(userData?.role) ||
                                                   String(file.uploadedBy?._id || file.uploadedBy) === String(userData?._id)) && (
                                                      <div className="flex gap-1 opacity-0 group-hover/file:opacity-100 transition-opacity">
                                                         <button onClick={(e) => { e.stopPropagation(); handleStartReplace(file._id); }} className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-700 flex items-center justify-center text-gray-500 hover:text-blue-500 shadow-sm transition-colors" title="Replace">
                                                            <i className="fa-solid fa-pen text-[10px]"></i>
                                                         </button>
                                                         <button onClick={(e) => { e.stopPropagation(); handleFileDelete(file._id); }} className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-700 flex items-center justify-center text-gray-500 hover:text-red-500 shadow-sm transition-colors" title="Delete">
                                                            <i className="fa-solid fa-trash text-[10px]"></i>
                                                         </button>
                                                      </div>
                                                   )}
                                             </div>
                                          );
                                       })
                                    ) : (
                                       <div className="text-center py-8 border-2 border-dashed border-gray-100 dark:border-zinc-800 rounded-xl">
                                          <p className="text-xs text-gray-400 font-medium">{t('no_files_attached')}</p>
                                       </div>
                                    )}
                                 </div>
                              </div>

                              {/* Footer Action */}
                              {userData?.role === 'team_lead' && project.status === 'assigned' && (
                                 <div className="mt-6 pt-4 border-t border-gray-100 dark:border-zinc-800">
                                    <button
                                       onClick={() => handleAccept(project)}
                                       disabled={isSubmitting}
                                       className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl text-sm font-bold shadow-green-500/20 shadow-lg transition-all active:scale-95"
                                    >
                                       {t('accept_assignment_button')}
                                    </button>
                                 </div>
                              )}
                           </div>
                        </div>
                     );
                  })}
               </div>
            ) : (
               <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm">
                  <div className="w-24 h-24 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                     <i className="fa-solid fa-folder-open text-3xl text-gray-300 dark:text-zinc-600"></i>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('no_projects_found')}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm text-center">
                     {t('no_projects_matching_filters')}
                  </p>
               </div>
            )}
         </div>

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
