/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useProjectStore } from '../store/project.store';
import { useAuthStore } from '../store/auth.store';
import { useCompanyStore } from '../store/company.store';
import PageLoader from '../components/loader/PageLoader';
import { useTranslation } from 'react-i18next';

const Projects = () => {
   const { t } = useTranslation();
   const { user } = useAuthStore();
   const userData = useMemo(() => user?.data?.user || user?.user || user, [user]);

   const {
      projects,
      getProjectsByCompany,
      acceptProject,
      isLoading: projectsLoading
   } = useProjectStore();

   const { selectedCompany } = useCompanyStore();

   const [statusFilter, setStatusFilter] = useState('All');
   const [isSubmitting, setIsSubmitting] = useState(false);

   // Fetch projects on mount
   useEffect(() => {
      const companyId = userData?.company?._id || userData?.company;
      if (companyId) {
         getProjectsByCompany(companyId);
      }
   }, [userData, getProjectsByCompany]);

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

   if (projectsLoading) return <PageLoader />;

   return (
      <div className="p-8 space-y-8">
         <div className="flex items-center justify-between">
            <div>
               <h1 className="text-3xl font-bold text-white mb-2">{t('my_projects')}</h1>
               <p className="text-gray-400">{t('manage_active_assignments')}</p>
            </div>
            <div className="flex items-center space-x-3">
               <select
                  className="bg-dark-tertiary border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-dark-accent"
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

         {/* Project Stats Cards could go here */}

         <div className="bg-dark-secondary border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full">
                  <thead className="bg-dark-tertiary">
                     <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Project</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Deadline</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Flags</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                     {filteredProjects.length > 0 ? (
                        filteredProjects.map((project) => (
                           <tr key={project._id} className="hover:bg-dark-tertiary transition">
                              <td className="px-6 py-4">
                                 <div>
                                    <p className="text-sm text-white font-medium">{project.title}</p>
                                    <p className="text-xs text-gray-400 truncate max-w-[200px]">{project.description}</p>
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-300">
                                 {project.client?.name || 'Unknown'}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-300">
                                 {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'No Deadline'}
                              </td>
                              <td className="px-6 py-4">
                                 <span className={`px-2 py-1 rounded text-xs font-medium uppercase
                                    ${project.status === 'assigned' ? 'bg-blue-500 bg-opacity-20 text-blue-500' :
                                       project.status === 'in_progress' ? 'bg-yellow-500 bg-opacity-20 text-yellow-500' :
                                          project.status === 'completed' ? 'bg-green-500 bg-opacity-20 text-green-500' :
                                             'bg-gray-700 text-gray-400'}`}>
                                    {t(project.status)}
                                 </span>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex flex-col space-y-1">
                                    {project.statusFlags?.isPaymentAccepted ? (
                                       <span className="text-[10px] text-green-400 flex items-center">
                                          <i className="fa-solid fa-check-circle mr-1"></i> Paid
                                       </span>
                                    ) : (
                                       <span className="text-[10px] text-gray-500 flex items-center">
                                          <i className="fa-regular fa-circle mr-1"></i> Unpaid
                                       </span>
                                    )}
                                    {project.statusFlags?.isWorkStarted && (
                                       <span className="text-[10px] text-blue-400 flex items-center">
                                          <i className="fa-solid fa-play mr-1"></i> Started
                                       </span>
                                    )}
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <div className="flex items-center space-x-2">
                                    {userData?.role === 'team_lead' && project.status === 'assigned' && (
                                       <button
                                          onClick={() => handleAccept(project)}
                                          disabled={isSubmitting}
                                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-medium transition"
                                       >
                                          Accept
                                       </button>
                                    )}
                                    {/* Future: Add 'View Details' or 'Submit Work' here */}
                                    {project.status !== 'assigned' && (
                                       <button className="text-gray-400 hover:text-white text-xs underline">
                                          View Details
                                       </button>
                                    )}
                                 </div>
                              </td>
                           </tr>
                        ))
                     ) : (
                        <tr>
                           <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                              <i className="fa-solid fa-clipboard-list text-3xl mb-3 opacity-50"></i>
                              <p>No projects found</p>
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
   );
};

export default Projects;
