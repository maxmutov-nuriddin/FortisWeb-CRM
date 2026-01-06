/* eslint-disable no-unused-vars */
import React, { useEffect } from 'react';
import { useAuthStore } from './store/auth.store';
import { useCompanyStore } from './store/company.store';
import { useProjectStore } from './store/project.store';
import { useTaskStore } from './store/task.store';
import { usePaymentStore } from './store/payment.store';
import { useChatStore } from './store/chat.store';
import { useUserStore } from './store/user.store';

const TestApi = () => {
   // --- Auth ---
   const { user, login, isAuthenticated, isLoading: authLoading, error: authError, getMe } = useAuthStore();
   useEffect(() => {
      if (isAuthenticated) {
         getMe();
      }
   }, [isAuthenticated]);

   // --- Companies ---
   const { companies, getCompanies, isLoading: companiesLoading, error: companiesError } = useCompanyStore();

   // --- Projects ---
   const { projects, getProjectsByCompany, isLoading: projectsLoading, error: projectsError } = useProjectStore();

   // --- Tasks ---
   const { tasks, getTasksByProject, isLoading: tasksLoading, error: tasksError } = useTaskStore();

   // --- Payments ---
   const { payments, getPaymentsByCompany, isLoading: paymentsLoading, error: paymentsError } = usePaymentStore();

   // --- Chat ---
   const { chats, getAllChats, isLoading: chatsLoading, error: chatsError } = useChatStore();

   // --- Users ---
   const { users, getUsersByCompany, updateUserStatus, getUserStats } = useUserStore();

   // --- Логин по кнопке ---
   const handleLogin = async () => {
      try {
         const res = await login({
            // email: 'admin@gmail.com',
            // password: 'test12',
            email: 'fortisweb.digital.stuido@gmail.com',
            password: 'MvFortisWebDigitalStudio',
         });

         console.log('Login response:', res);

         const userId = res?.data?.user?._id;
         if (userId) {
            await updateUserStatus(userId, true);
         }

         // После успешного логина подтягиваем данные
         await getUserStats();
         await getCompanies();
         await getProjectsByCompany('695a5e6c71aac9ad070bd517');
         await getTasksByProject('695a61b7855d6f3a1c8582de');
         await getPaymentsByCompany('695a5e6c71aac9ad070bd517');
         await getAllChats();
         await getUsersByCompany('695a5e6c71aac9ad070bd517');
      } catch (err) {
         console.error('Error during login/fetching data:', err);
      }
   };

   return (
      <div className="p-4 space-y-8">
         {/* Кнопка логина */}
         {!isAuthenticated && (
            <button
               onClick={handleLogin}
               className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
               Login
            </button>
         )}

         {/* Dashboard Section */}
         {isAuthenticated && (
            <>
               <section>
                  <h2>Сводка по компании</h2>
                  <p>{companies?.data?.companies?.[0]?.name}</p>
                  <p>Admin: {companies?.data?.companies[0]?.companyAdmin.name}</p>
                  <p>Employees: {companies?.data?.companies[0]?.employees?.length}</p>
                  <p>Active: {companies?.data?.companies[0]?.isActive?.toString()}</p>
               </section>

               <section>
                  <h2>Проекты</h2>
                  <p>Total Projects: {projects?.data?.projects?.length}</p>
                  {projects?.data?.projects?.map(p => (
                     <div key={p._id}>{p.title}: {p.status}</div>
                  ))}
               </section>

               <section>
                  <h2>Задачи</h2>
                  <p>Total Tasks: {tasks?.data?.tasks?.length}</p>
                  {tasks?.data?.tasks?.map(t => (
                     <div key={t._id}>
                        {t.title} ({t.status}), assigned to {t.assignedTo.name}
                     </div>
                  ))}
               </section>

               <section>
                  <h2>Финансы</h2>
                  {payments?.data?.payments?.map(p => (
                     <div key={p._id}>
                        Project: {p.project.title}, Total: {p.totalAmount}, Status: {p.status}
                     </div>
                  ))}
               </section>

               <section>
                  <h2>Пользователи</h2>
                  {users?.data?.users?.map(u => (
                     <div key={u._id}>
                        {u.name} ({u.role}), last login: {u.lastLogin}
                     </div>
                  ))}
               </section>
            </>
         )}
      </div>
   );
};

export default TestApi;
