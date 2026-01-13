/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useMemo } from 'react';

import { useAuthStore } from '../../store/auth.store';
import { useCompanyStore } from '../../store/company.store';
import { useProjectStore } from '../../store/project.store';
import { useTaskStore } from '../../store/task.store';
import { useProjectUploadStore } from '../../store/project-upload.store'; // Import new store
import { toast } from 'react-toastify';

const UniversalUploadModal = ({ isOpen, onClose, onSuccess }) => {
   const { user } = useAuthStore();
   const userData = useMemo(() => user?.data?.user || user?.user || user, [user]);

   const isSuperAdmin = userData?.role === 'super_admin';
   const isCompanyAdmin = userData?.role === 'company_admin';
   const isCompanyOwner = userData?.role === 'company_owner';
   const isTeamLead = userData?.role === 'team_lead';
   // Others: frontend, backend, marketer, designer, employee
   const isEmployee = !isSuperAdmin && !isCompanyAdmin && !isCompanyOwner && !isTeamLead;

   const { companies, getCompanies } = useCompanyStore();
   // eslint-disable-next-line no-unused-vars
   const { projects, getProjectsByCompany, getAllProjects } = useProjectStore();
   const { tasks, getTasksByProject } = useTaskStore();
   const { uploadFile, isLoading: uploading } = useProjectUploadStore(); // Use store hook

   const [selectedCompany, setSelectedCompany] = useState('');
   const [selectedProject, setSelectedProject] = useState('');
   const [selectedTask, setSelectedTask] = useState('');
   const [file, setFile] = useState(null);
   const [description, setDescription] = useState('');
   // const [uploading, setUploading] = useState(false); // Managed by store now

   const fileInputRef = React.useRef(null);

   // Reset state when modal opens
   useEffect(() => {
      if (isOpen) {
         setSelectedCompany('');
         setSelectedProject('');
         setSelectedTask('');
         setFile(null);
         setDescription('');
         if (fileInputRef.current) fileInputRef.current.value = '';

         if (isSuperAdmin) {
            getCompanies();
         } else if (userData?.company) {
            const companyId = userData.company._id || userData.company;
            setSelectedCompany(companyId);
            getProjectsByCompany(companyId);
         }
      }
   }, [isOpen, isSuperAdmin, userData, getCompanies, getProjectsByCompany]);

   // Helper to extract clean array of companies
   const companyList = useMemo(() => {
      return companies?.data?.companies || (Array.isArray(companies) ? companies : []) || [];
   }, [companies]);

   // Helper to extract clean array of projects
   const projectList = useMemo(() => {
      const list = projects?.data?.projects || (Array.isArray(projects) ? projects : []) || [];
      const myRole = userData?.role;
      const myId = String(userData?._id || userData?.id || '');

      if (isSuperAdmin || isCompanyAdmin || isCompanyOwner) return list;

      return list.filter(p => {
         if (isTeamLead) {
            return String(p.teamLead?._id || p.teamLead || '') === myId;
         }
         // Employee/Worker
         return p.assignedMembers?.some(m => String(m.user?._id || m.user || m) === myId);
      });
   }, [projects, isSuperAdmin, isCompanyAdmin, isCompanyOwner, isTeamLead, userData]);

   // Helper to extract clean array of tasks
   const taskList = useMemo(() => {
      return tasks || []; // store usually returns direct array or object structure depending on implementation
   }, [tasks]);


   // Handlers
   const handleCompanyChange = (e) => {
      const compId = e.target.value;
      setSelectedCompany(compId);
      setSelectedProject('');
      setSelectedTask('');
      if (compId) {
         getProjectsByCompany(compId);
      }
   };

   const handleProjectChange = (e) => {
      const projId = e.target.value;
      setSelectedProject(projId);
      setSelectedTask('');
      if (projId && isEmployee) {
         getTasksByProject(projId);
      }
   };

   const handleFileChange = (e) => {
      if (e.target.files && e.target.files[0]) {
         setFile(e.target.files[0]);
      }
   };

   const handleSubmit = async (e) => {
      e.preventDefault();
      if (!file) {
         toast.error('Please select a file');
         return;
      }

      // Validation based on roles
      if (isSuperAdmin && !selectedCompany) {
         toast.error('Please select a company');
         return;
      }
      if ((isSuperAdmin || isCompanyAdmin || isCompanyOwner || isTeamLead) && !selectedProject) {
         toast.error('Please select a project (order)');
         return;
      }
      if (isEmployee && !selectedTask) {
         toast.error('Please select a task');
         return;
      }

      const formData = new FormData();
      formData.append('file', file);
      if (selectedCompany) formData.append('companyId', selectedCompany);
      if (selectedProject) formData.append('orderId', selectedProject);
      if (selectedTask) formData.append('taskId', selectedTask);
      if (description) formData.append('description', description);

      try {
         await uploadFile(formData);
         toast.success('File uploaded successfully');
         if (onSuccess) onSuccess();
         onClose();
      } catch (error) {
         console.error(error);
         // Error handled in store, but toast here for UX logic flow if needed, though store sets error state.
         // Actually toast provided in catch block of component is fine.
         toast.error(error.response?.data?.message || 'Error uploading file');
      }
   };

   if (!isOpen) return null;

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
         <div className="bg-white dark:bg-dark-secondary rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
               <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Upload File
               </h3>
               <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition"
               >
                  <i className="fa-solid fa-times text-xl"></i>
               </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">

               {/* Company Selection - Super Admin only */}
               {isSuperAdmin && (
                  <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Company
                     </label>
                     <select
                        value={selectedCompany}
                        onChange={handleCompanyChange}
                        className="w-full bg-gray-50 dark:bg-dark-tertiary border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-dark-accent focus:border-transparent outline-none transition"
                     >
                        <option value="">Select Company</option>
                        {companyList.map(comp => (
                           <option key={comp._id} value={comp._id}>{comp.name}</option>
                        ))}
                     </select>
                  </div>
               )}

               {/* Project/Order Selection */}
               <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                     Project (Order)
                  </label>
                  <select
                     value={selectedProject}
                     onChange={handleProjectChange}
                     disabled={isSuperAdmin && !selectedCompany}
                     className="w-full bg-gray-50 dark:bg-dark-tertiary border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-dark-accent focus:border-transparent outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <option value="">Select Project</option>
                     {projectList.map(proj => (
                        <option key={proj._id} value={proj._id}>{proj.title}</option>
                     ))}
                  </select>
               </div>

               {/* Task Selection - Employees/Others only */}
               {isEmployee && (
                  <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Task
                     </label>
                     <select
                        value={selectedTask}
                        onChange={(e) => setSelectedTask(e.target.value)}
                        disabled={!selectedProject}
                        className="w-full bg-gray-50 dark:bg-dark-tertiary border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-dark-accent focus:border-transparent outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        <option value="">Select Task</option>
                        {taskList.map(task => (
                           <option key={task._id} value={task._id}>{task.title}</option>
                        ))}
                     </select>
                  </div>
               )}

               {/* File Input */}
               <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                     File
                  </label>
                  <div className="flex items-center justify-center w-full">
                     <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-dark-tertiary hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                           <i className="fa-solid fa-cloud-arrow-up text-3xl text-gray-400 mb-3"></i>
                           <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                           </p>
                           <p className="text-xs text-gray-500 dark:text-gray-400">
                              {file ? file.name : 'Any file'}
                           </p>
                        </div>
                        <input
                           type="file"
                           ref={fileInputRef}
                           className="hidden"
                           onChange={handleFileChange}
                        />
                     </label>
                  </div>
               </div>

               {/* Description */}
               <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                     Description (Optional)
                  </label>
                  <textarea
                     value={description}
                     onChange={(e) => setDescription(e.target.value)}
                     rows="3"
                     className="w-full bg-gray-50 dark:bg-dark-tertiary border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-dark-accent focus:border-transparent outline-none transition resize-none"
                     placeholder="Add a note about this file..."
                  ></textarea>
               </div>

               {/* Footer Buttons */}
               <div className="flex justify-end space-x-3 pt-2">
                  <button
                     type="button"
                     onClick={onClose}
                     className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition"
                  >
                     Cancel
                  </button>
                  <button
                     type="submit"
                     disabled={uploading}
                     className="px-4 py-2 text-sm font-medium text-white bg-dark-accent hover:bg-blue-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dark-accent transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                  >
                     {uploading && <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>}
                     {uploading ? 'Uploading...' : 'Upload'}
                  </button>
               </div>

            </form>
         </div>
      </div>
   );
};

export default UniversalUploadModal;
