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
      getMe(); // вызываем функцию для получения данных пользователя
   }, []);
   console.log(user);

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

   // --- Авто-тест функций ---
   useEffect(() => {
      const autoLoginAndFetch = async () => {
         try {
            if (!isAuthenticated) {
               const res = await login({
                  email: 'fortisweb.digital.stuido@gmail.com',
                  password: 'MvFortisWebDigitalStudio',
               })

               const userId = res?.data?.user?._id
               if (userId) {
                  await updateUserStatus(userId, true)
               }
            }
            await getUserStats()
            await getCompanies()
            await getProjectsByCompany('695a5e6c71aac9ad070bd517')
            await getTasksByProject('695a61b7855d6f3a1c8582de')
            await getPaymentsByCompany('695a5e6c71aac9ad070bd517')
            await getAllChats()
            await getUsersByCompany('695a5e6c71aac9ad070bd517')

         } catch (err) {
            console.error('Error fetching data:', err)
         }
      }

      autoLoginAndFetch()
   }, [isAuthenticated, login])

   return (
      <div className="p-4 space-y-8">
         {/* Dashboard Section */}
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


         {/* Orders Section */}
         <section>
            <h2 className="text-xl font-bold mb-2">2️⃣ Orders / Projects</h2>
            <pre>{JSON.stringify(projects, null, 2)}</pre>
         </section>

         {/* Payments Section */}
         <section>
            <h2 className="text-xl font-bold mb-2">3️⃣ Payments</h2>
            <pre>{JSON.stringify(payments, null, 2)}</pre>
         </section>

         {/* Profile Section */}
         <section>
            <h2 className="text-xl font-bold mb-2">4️⃣ Profile</h2>
            <pre>{JSON.stringify(user, null, 2)}</pre>
         </section>

         {/* Settings Section */}
         <section>
            <h2 className="text-xl font-bold mb-2">5️⃣ Settings</h2>
            <pre>{JSON.stringify(users, null, 2)}</pre>
         </section>

         {/* SignIn / SignUp Section */}
         <section>
            <h2 className="text-xl font-bold mb-2">6️⃣ SignIn / SignUp</h2>
            <pre>{JSON.stringify(user, null, 2)}</pre>
         </section>

         {/* Tasks Section */}
         <section>
            <h2 className="text-xl font-bold mb-2">7️⃣ Tasks</h2>
            <pre>{JSON.stringify(tasks, null, 2)}</pre>
         </section>

         {/* NotFound Section */}
         <section>
            <h2 className="text-xl font-bold mb-2">8️⃣ NotFound</h2>
            <p>Если маршрут не найден, будет отображена эта секция.</p>
         </section>

         {/* Loading & Errors */}
         <section>
            <h2 className="text-xl font-bold mb-2">🔄 Loading states</h2>
            <ul>
               <li>Auth: {authLoading.toString()}</li>
               <li>Companies: {companiesLoading.toString()}</li>
               <li>Projects: {projectsLoading.toString()}</li>
               <li>Tasks: {tasksLoading.toString()}</li>
               <li>Payments: {paymentsLoading.toString()}</li>
               <li>Chats: {chatsLoading.toString()}</li>
            </ul>

            <h2 className="text-xl font-bold mb-2">❌ Errors</h2>
            <ul>
               <li>Auth: {authError}</li>
               <li>Companies: {companiesError}</li>
               <li>Projects: {projectsError}</li>
               <li>Tasks: {tasksError}</li>
               <li>Payments: {paymentsError}</li>
               <li>Chats: {chatsError}</li>
            </ul>
         </section>
      </div>
   );
};

export default TestApi;
