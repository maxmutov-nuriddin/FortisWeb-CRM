Примечание по backend-логике

Данный функционал уже реализован на стороне backend.
Создание новых сущностей, таблиц или API-эндпоинтов не требуется.

Необходимо:

использовать уже существующие backend-запросы;

корректно подключить их на frontend;

при необходимости адаптировать логику проекта (исправление, расширение, обработка данных), не затрагивая архитектуру backend;

не дублировать и не пересоздавать существующие механизмы.

Backend в текущем виде считается источником истины, все изменения касаются только:

правильного получения данных;

корректного отображения;

корректной обработки ролей / прав / бизнес-логики на уровне проекта.

Ниже будут перечислены запросы (API), которые уже реализованы в backend и должны использоваться без создания новых.


| Маршрут              | Метод  | Функция          | Обязательные поля (Body)         | Опциональные поля / Примечания                                      |
| :------------------- | :----- | :--------------- | :------------------------------- | :------------------------------------------------------------------ |
| `/api/auth/register` | `POST` | `register`       | `name`, `email`, `password`      | `role`, `company`. Создает super_admin если система пуста.          |
| `/api/auth/login`    | `POST` | `login`          | `email`, `password`              | Возвращает JWT токен и данные пользователя.                         |
| `/api/auth/me`       | `GET`  | `getCurrentUser` | -                                | Требует `Authorization: Bearer <token>`. Возвращает текущего юзера. |
| `/api/auth/profile`  | `PUT`  | `updateProfile`  | -                                | `name`, `phone`, `avatar`.                                          |
| `/api/auth/password` | `PUT`  | `changePassword` | `currentPassword`, `newPassword` | Смена пароля текущего пользователя.                                 |

#### ✅ controllers/userController.js & routes/users.js

| Маршрут                         | Метод    | Функция            | Обязательные поля              | Опциональные поля / IDs                                               |
| :------------------------------ | :------- | :----------------- | :----------------------------- | :-------------------------------------------------------------------- |
| `/api/users`                    | `POST`   | `createUser`       | `name`, `email`, `password`    | `role`, `phone`, `position`, `companyId` (для super_admin), `teamId`. |
| `/api/users/employee`           | `POST`   | `createUser`       | `name`, `email`, `password`    | Алиас для создания сотрудника.                                        |
| `/api/users/company/:companyId` | `GET`    | `getCompanyUsers`  | `companyId` (params)           | Получение всех сотрудников компании.                                  |
| `/api/users/:id`                | `GET`    | `getUser`          | `id` (params)                  | Получение данных одного сотрудника.                                   |
| `/api/users/:id`                | `PUT`    | `updateUser`       | `id` (params)                  | `name`, `email`, `role`, `phone`, `position`, `salary`, `teamId`.     |
| `/api/users/:id/status`         | `PATCH`  | `toggleUserStatus` | `id` (params)                  | Переключает `isActive` (true/false).                                  |
| `/api/users/employee/:id`       | `DELETE` | `deleteUser`       | `id` (params)                  | Удаление пользователя.                                                |
| `/api/users/employee/:id/move`  | `PUT`    | `moveUser`         | `id` (params), `teamId` (body) | Перемещение сотрудника в другую команду.                              |
| `/api/users/:id/stats`          | `GET`    | `getUserStats`     | `id` (params)                  | Статистика задач и проектов пользователя.                             |

#### ✅ controllers/companyController.js & routes/companies.js

| Маршрут                                 | Метод    | Функция                   | Обязательные поля                                                          | Опциональные поля / IDs                                                                              |
| :-------------------------------------- | :------- | :------------------------ | :------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| `/api/companies`                        | `POST`   | `createCompany`           | `name`                                                                     | `email`, `description`, `phone`, `address`, `companyAdminData` {name, email, password}.              |
| `/api/companies`                        | `GET`    | `getAllCompanies`         | -                                                                          | Получение списка всех компаний (только super_admin).                                                 |
| `/api/companies/:id`                    | `GET`    | `getCompany`              | `id` (params)                                                              | Детальная информация о компании, включая команды и сотрудников.                                      |
| `/api/companies/:id`                    | `PUT`    | `updateCompany`           | `id` (params)                                                              | `name`, `description`, `email`, `phone`, `address`, `logo`, `settings` {customCommissionRate, etc.}. |
| `/api/companies/:id/status`             | `PATCH`  | `toggleCompanyStatus`     | `id` (params)                                                              | Активация/деактивация компании.                                                                      |
| `/api/companies/:id/teams`              | `POST`   | `createTeam`              | `id` (params), `name`, `teamLeadId`                                        | `description`. Создает новую команду.                                                                |
| `/api/companies/:id/teams/members`      | `POST`   | `addTeamMember`           | `id` (params), `teamId`, `userId`                                          | Добавление сотрудника в команду.                                                                     |
| `/api/companies/:id`                    | `DELETE` | `deleteCompany`           | `id` (params)                                                              | Полное удаление компании.                                                                            |
| `/api/companies/:id/teams/:teamId`      | `DELETE` | `deleteTeam`              | `id`, `teamId` (params)                                                    | Удаление команды.                                                                                    |
| `/api/companies/:id/subscription`       | `POST`   | `updateSubscription`      | `id` (params), `type`                                                      | `isActive`. Типы: `starter`, `pro`, `business`, `none`.                                              |
| `/api/companies/:id/distribution-rates` | `PUT`    | `updateDistributionRates` | `id` (params), `customCommissionRate`, `customAdminRate`, `customTeamRate` | Сумма должна быть равна 100.                                                                         |

#### ✅ controllers/projectController.js & routes/projects.js

| Маршрут                             | Метод    | Функция                    | Обязательные поля                                             | Опциональные поля / IDs                                                 |
| :---------------------------------- | :------- | :------------------------- | :------------------------------------------------------------ | :---------------------------------------------------------------------- |
| `/api/projects`                     | `POST`   | `createProject`            | `title` OR `name`                                             | `description`, `client`, `budget`, `deadline`, `priority`, `companyId`. |
| `/api/projects/company/:companyId`  | `GET`    | `getCompanyProjects`       | `companyId` (params)                                          | Фильтры (query): `status`, `priority`, `teamLead`.                      |
| `/api/projects/:id`                 | `GET`    | `getProject`               | `id` (params)                                                 | Детальная информация о проекте и оплате.                                |
| `/api/projects/:id`                 | `PUT`    | `updateProject`            | `id` (params)                                                 | `title`, `description`, `budget`, `status`, `priority`, `client`.       |
| `/api/projects/:id/assign`          | `PUT`    | `assignTeam`               | `id` (params)                                                 | `teamLeadId`, `memberIds`[] OR `assignedMembers`[], `assignedTeamId`.   |
| `/api/projects/:id/work-percentage` | `PUT`    | `updateWorkPercentage`     | `id` (params), `membersWork`[]                                | `membersWork`: [{userId, percentage}].                                  |
| `/api/projects/:id/results`         | `POST`   | `uploadResults`            | `id` (params), `url`                                          | `name`, `description`. Переводит статус в `review`.                     |
| `/api/projects/:id/revision`        | `POST`   | `requestRevision`          | `id` (params), `message`                                      | Запрос доработок. Статус -> `revision`.                                 |
| `/api/projects/:id/complete`        | `PUT`    | `completeProject`          | `id` (params)                                                 | Завершение проекта. Статус -> `completed`.                              |
| `/api/projects/:id/accept`          | `POST`   | `acceptProject`            | `id` (params), `clientFullName`, `clientPhone`, `clientEmail` | `clientAddress`. Принятие проекта в работу.                             |
| `/api/projects/:id/status-flags`    | `PUT`    | `updateProjectStatusFlags` | `id` (params)                                                 | `isProjectAccepted`, `isPaymentAccepted` (boolean).                     |
| `/api/projects/history/all`         | `GET`    | `getOrderHistory`          | -                                                             | История заказов компании.                                               |
| `/api/projects/:id`                 | `DELETE` | `deleteProject`            | `id` (params)                                                 | Удаление проекта (super_admin).                                         |

#### ✅ controllers/taskController.js & routes/tasks.js

| Маршрут                         | Метод    | Функция            | Обязательные поля       | Опциональные поля / IDs                                                                   |
| :------------------------------ | :------- | :----------------- | :---------------------- | :---------------------------------------------------------------------------------------- |
| `/api/tasks`                    | `POST`   | `createTask`       | `title`, `projectId`    | `description`, `assignedTo`, `deadline`, `priority`, `estimatedHours`.                    |
| `/api/tasks/project/:projectId` | `GET`    | `getProjectTasks`  | `projectId` (params)    | Все задачи конкретного проекта.                                                           |
| `/api/tasks/user/:userId?`      | `GET`    | `getUserTasks`     | -                       | `userId` (params, опционально). Фильтр (query): `status`.                                 |
| `/api/tasks/:id/status`         | `PUT`    | `updateTaskStatus` | `id` (params), `status` | `actualHours`. Авто-расчет выплаты при `completed`.                                       |
| `/api/tasks/:id/comments`       | `POST`   | `addComment`       | `id` (params), `text`   | Добавление комментария к задаче.                                                          |
| `/api/tasks/:id/weight`         | `PUT`    | `updateTaskWeight` | `id` (params), `weight` | Вес от 1 до 10 (для расчета зарплаты).                                                    |
| `/api/tasks/:id`                | `PUT`    | `updateTask`       | `id` (params)           | `title`, `description`, `assignedTo`, `deadline`, `priority`, `estimatedHours`, `weight`. |
| `/api/tasks/:id`                | `DELETE` | `deleteTask`       | `id` (params)           | Удаление задачи.                                                                          |

#### ✅ controllers/paymentController.js & routes/payments.js

| Маршрут                            | Метод    | Функция                | Обязательные поля          | Опциональные поля / IDs                                                       |
| :--------------------------------- | :------- | :--------------------- | :------------------------- | :---------------------------------------------------------------------------- |
| `/api/payments`                    | `POST`   | `createPayment`        | `projectId`, `totalAmount` | `paymentMethod` (default: bank_transfer).                                     |
| `/api/payments/:id/confirm`        | `PUT`    | `confirmPayment`       | `id` (params)              | Подтверждение получения оплаты от клиента.                                    |
| `/api/payments/:id/complete`       | `PUT`    | `completePayment`      | `id` (params)              | Распределение средств между участниками.                                      |
| `/api/payments/company/:companyId` | `GET`    | `getCompanyPayments`   | `companyId` (params)       | Список всех транзакций компании.                                              |
| `/api/payments/user/:userId?`      | `GET`    | `getUserPayments`      | -                          | `userId` (params). Только завершенные выплаты юзера.                          |
| `/api/payments/history/list`       | `GET`    | `getPaymentHistory`    | -                          | Фильтры (query): `employeeId`, `companyId`, `teamId`, `startDate`, `endDate`. |
| `/api/payments/history/export`     | `GET`    | `exportPaymentHistory` | -                          | Экспорт истории в CSV.                                                        |
| `/api/payments/history/:id`        | `DELETE` | `deletePaymentHistory` | `id` (params)              | Удаление записи истории (super_admin).                                        |

#### ✅ controllers/chatController.js & routes/chat.js

| Маршрут                  | Метод  | Функция           | Обязательные поля     | Опциональные поля / IDs                   |
| :----------------------- | :----- | :---------------- | :-------------------- | :---------------------------------------- |
| `/api/chat`              | `POST` | `createChat`      | `participants`[]      | `type`, `name`, `teamId`, `projectId`.    |
| `/api/chat`              | `GET`  | `getUserChats`    | -                     | Все активные чаты текущего пользователя.  |
| `/api/chat/:id/messages` | `GET`  | `getChatMessages` | `id` (params)         | Query: `limit`, `skip`.                   |
| `/api/chat/:id/messages` | `POST` | `sendMessage`     | `id` (params), `text` | `files`[] (массив ссылок).                |
| `/api/chat/:id/read`     | `PUT`  | `markAsRead`      | `id` (params)         | Пометить все сообщения чата прочитанными. |
