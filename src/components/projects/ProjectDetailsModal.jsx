import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';

const ProjectDetailsModal = ({ isOpen, onClose, project }) => {
   const { t } = useTranslation();

   if (!isOpen || !project) return null;

   const getStatusStyle = (status) => {
      switch (status) {
         case 'assigned': return 'bg-blue-100 text-blue-700 border-blue-200';
         case 'in_progress': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
         case 'completed': return 'bg-green-100 text-green-700 border-green-200';
         case 'review': return 'bg-purple-100 text-purple-700 border-purple-200';
         default: return 'bg-gray-100 text-gray-700 border-gray-200';
      }
   };

   const isPaid = project.statusFlags?.isPaymentAccepted;
   const isStarted = project.statusFlags?.isWorkStarted;

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
         <div className="bg-white dark:bg-dark-secondary rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-gray-800 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
               <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('project_details') || 'Project Details'}
               </h3>
               <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition"
               >
                  <i className="fa-solid fa-times text-xl"></i>
               </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
               {/* Header Info: Client & Status */}
               <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-center space-x-3">
                     <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                        {project.client?.name ? project.client.name.charAt(0).toUpperCase() : 'C'}
                     </div>
                     <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                           {project.client?.name || 'Unknown Client'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                           Deadline: {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'No Deadline'}
                        </p>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusStyle(project.status)}`}>
                        {t(project.status) || project.status}
                     </span>
                     {isPaid && <span className="text-green-500 text-lg" title="Paid"><i className="fa-solid fa-check-circle"></i></span>}
                     {isStarted && <span className="text-blue-500 text-lg" title="Started"><i className="fa-solid fa-play"></i></span>}
                  </div>
               </div>

               {/* Title & Description */}
               <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                     {project.title}
                  </h2>
                  <div className="bg-gray-50 dark:bg-dark-tertiary p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                     <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {project.description || 'No description provided.'}
                     </p>
                  </div>
               </div>

               {/* Additional Metadata Grid */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  {/* Team Lead */}
                  <div>
                     <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Team Lead</h4>
                     <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                           {project.teamLead?.name ? project.teamLead.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                           {project.teamLead?.name || 'Unassigned'}
                        </span>
                     </div>
                  </div>

                  {/* Created Date */}
                  <div>
                     <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Created At</h4>
                     <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(project.createdAt).toLocaleDateString()}
                     </p>
                  </div>
               </div>

               {/* Assigned Members */}
               {project.assignedMembers?.length > 0 && (
                  <div className="pt-2">
                     <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Assigned Members</h4>
                     <div className="flex flex-wrap gap-2">
                        {project.assignedMembers.map((member, idx) => {
                           const mName = member.user?.name || member.name || 'Unknown';
                           return (
                              <div key={idx} className="flex items-center space-x-2 bg-gray-50 dark:bg-dark-tertiary px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
                                 <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                                    {mName.charAt(0).toUpperCase()}
                                 </div>
                                 <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{mName}</span>
                                 <span className="text-[10px] text-gray-400 uppercase">({member.role})</span>
                              </div>
                           );
                        })}
                     </div>
                  </div>
               )}
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-dark-tertiary flex justify-end">
               <button
                  onClick={onClose}
                  className="px-5 py-2 text-sm font-medium text-white bg-dark-accent hover:bg-blue-700 rounded-lg transition"
               >
                  Close
               </button>
            </div>
         </div>
      </div>
   );
};

export default ProjectDetailsModal;
