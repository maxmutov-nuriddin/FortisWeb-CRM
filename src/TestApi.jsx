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
   const { user, login, isAuthenticated, isLoading: authLoading, error: authError } = useAuthStore();

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
   const { users, getUsersByCompany } = useUserStore();

   // --- Авто-тест функции ---
   const testAuth = async () => {
      console.log('Auth test: isAuthenticated=', isAuthenticated, 'user=', user);
   };

   const testCompanies = async () => {
      await getCompanies();
      console.log('Companies:', companies);
   };

   const testProjects = async () => {
      await getProjectsByCompany("695a5e6c71aac9ad070bd517");
      console.log('Projects:', projects);
   };

   const testTasks = async () => {
      await getTasksByProject("695a5e6c71aac9ad070bd517");
      console.log('Tasks:', tasks);
   };

   const testPayments = async () => {
      await getPaymentsByCompany("695a5e6c71aac9ad070bd517");
      console.log('Payments:', payments);
   };

   const testChat = async () => {
      await getAllChats();
      console.log('Chats:', chats);
   };

   const testUsers = async () => {
      await getUsersByCompany("695a5e6c71aac9ad070bd517");
      console.log('Users:', users);
   };

   // --- useEffect для автологина и автотеста ---
   useEffect(() => {
      const autoLoginAndTest = async () => {
         try {
            if (!isAuthenticated) {
               await login({
                  email: 'fortisweb.digital.stuido@gmail.com',
                  password: 'MvFortisWebDigitalStudio'
               });
               console.log('Logged in successfully!');
            }

            // После логина запускаем тесты
            await testAuth();
            await testCompanies();
            await testProjects();
            await testTasks();
            await testPayments();
            await testChat();
            await testUsers();
         } catch (err) {
            console.error('Login or API error:', err);
         }
      };

      autoLoginAndTest();
   }, [isAuthenticated, login]);

   return (
      <div className="p-4">
         <h1>Test API & Zustand Stores</h1>
         <div>
            <h2>Loading states</h2>
            <ul>
               <li>Auth: {authLoading.toString()}</li>
               <li>Companies: {companiesLoading.toString()}</li>
               <li>Projects: {projectsLoading.toString()}</li>
               <li>Tasks: {tasksLoading.toString()}</li>
               <li>Payments: {paymentsLoading.toString()}</li>
               <li>Chats: {chatsLoading.toString()}</li>
            </ul>
         </div>
         <div>
            <h2>Errors</h2>
            <ul>
               <li>Auth: {authError}</li>
               <li>Companies: {companiesError}</li>
               <li>Projects: {projectsError}</li>
               <li>Tasks: {tasksError}</li>
               <li>Payments: {paymentsError}</li>
               <li>Chats: {chatsError}</li>
            </ul>
         </div>
         <div>
            <h2>Data Preview</h2>
            <pre>{JSON.stringify({ user, companies, projects, tasks, payments, chats, users }, null, 2)}</pre>
         </div>
      </div>
   );
};

export default TestApi;
