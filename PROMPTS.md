# Prompts.md — How I Used AI to Build TrustVault

I used ChatGPT to help me build TrustVault step by step. I did not know every part of the technology beforehand, so I asked for help with the database, login, document storage, permissions and dashboard.

While working on the project, I also faced errors and situations where the first solution was not enough. I used the errors and the existing code to ask for corrections instead of rebuilding everything from the beginning.

The following entries describe the main stages of my work and the problems I noticed.

## 1. Setting Up the Database

**What I asked AI:**

"Help me start TrustVault. I need a database for users, documents, permissions and audit logs. I also want some sample accounts for admin, owner and viewer so I can test the project."

**What AI provided:**

It helped me create the Prisma schema and a seed script for creating test users.

**What went wrong:**

When I tried to seed the database, I got an error because the seed script used a `name` field that was missing from the User model.

**What I did next:**

I shared the error and asked AI to check the schema and seed script together. We added the missing field and aligned the database model with the data being inserted.

**What I learned:**

The database schema and the code that uses it must match. Even a small mismatch can stop the application from working.

**Fixing commit:** I have not added the exact commit link yet.

## 2. Fixing Login and Session Security

**What I asked AI:**

"Help me make the login work properly. I need to check the user's password, keep the user logged in securely, and allow the application to know which user is currently logged in."

**What AI provided:**

It helped create the authentication utility, password verification and session-cookie handling.

**What went wrong:**

The first version needed stronger production cookie settings. I also faced import and authentication errors while connecting the authentication functions to the dashboard.

**What I did next:**

I shared the errors and the existing code, then asked for corrections that matched the functions already used by the application. We worked on the session-cookie settings and the authentication imports instead of changing the entire project.

**What I learned:**

Login is not just checking an email and password. Session handling also needs to be considered, and changes to shared authentication functions can affect other pages.

**Fixing commit:** I have not added the exact commit link yet.

## 3. Fixing Document Storage and Search

**What I asked AI:**

"Help me upload documents safely and let users search for documents by title and category. Please give me the complete code so I can replace the file without guessing where each part goes."

**What AI provided:**

It helped create document storage utilities and database queries for searching and listing documents.

**What went wrong:**

I encountered TypeScript errors involving search properties and database types. Later, I also had to deal with the difference between storing files on the local server and storing them in Supabase for deployment.

**What I did next:**

I shared the current code and asked for complete replacements. We corrected the search property mismatch and then moved the upload and download process towards Supabase Storage.

I also checked the Supabase Storage bucket and discovered that the bucket list was empty. I created a bucket and continued configuring the storage integration.

**What I learned:**

A solution that works on a local computer is not automatically suitable for a deployed application. The storage system must also work in the hosting environment.

**Fixing commit:** I have not added the exact commit link yet.

## 4. Checking Document Permissions and Downloads

**What I asked AI:**

"Help me make document downloads secure. If one user does not have permission for a document, they should not be able to download it just by changing the document ID in the URL. I also need owners to grant and remove access."

**What AI provided:**

It helped with permission-management actions and the document download route.

**What went wrong:**

While reviewing the security requirements, I understood that simply hiding a download button is not enough. The server itself must check permission whenever someone requests a document.

I also needed to make sure that removing a permission affects later download requests rather than relying only on the user's login session.

**What I did next:**

I asked for server-side authorization checks and audit logging for refused download attempts. I also continued working on the Supabase download flow so that the file could be retrieved from storage after the permission check.

**What I learned:**

The server must make the final decision about document access. A user interface can be changed or bypassed, so it cannot be the only security control.

**What I still need to verify:**

The download route needs automated tests for unauthorized access. Other operations, such as editing, deleting and changing permissions, must also be checked separately.

**Fixing commit:** I have not added the exact commit link yet.

## 5. Connecting the Dashboard and Admin Panel

**What I asked AI:**

"Help me finish the dashboard and admin page. I want the dashboard to show documents and support uploads, and I want the admin page to display activity logs. Please keep the working parts of my project and give me complete code when a file needs changes."

**What AI provided:**

It helped with the dashboard and administrator page, including the document list, upload interface and activity display.

**What went wrong:**

I encountered TypeScript errors involving property names and data returned from database queries. I also had to fix issues where one page expected a different property name from the one returned by the backend.

**What I did next:**

I shared the existing files and error messages so that the changes could be based on the actual project rather than starting from scratch. I checked that the application built successfully before moving on to deployment.

**What I learned:**

The frontend and backend must agree on the shape of the data. Making a TypeScript error disappear is not enough if the page still expects the wrong information at runtime.

**Fixing commit:** I have not added the exact commit link yet.

## 6. Connecting Supabase Storage and Deploying

**What I asked AI:**

"I have deployed TrustVault, but I need to make sure uploaded files work properly with Supabase Storage. Guide me through checking the bucket and completing the deployment without breaking the existing application."

**What AI provided:**

It guided me through checking the Supabase bucket, configuring the server-side storage connection, creating the upload route and updating the download route.

**What went wrong:**

The storage bucket had not been created initially. I also had to make sure that the application used the correct storage configuration and did not depend on files saved only on the local server.

**What I did next:**

I created the bucket, followed the configuration steps and pushed the code to GitHub. Vercel was connected to the repository and deployed the application. I also removed two duplicate Vercel projects that I had created by mistake.

**What I learned:**

Deployment is only one part of finishing a project. I still need to check the live application's behavior, especially permissions, storage privacy and audit logging.

**Fixing commit:** I have not added the exact commit link yet.

## My Overall Experience Using AI

AI helped me understand unfamiliar parts of the project and move forward when I faced errors. However, I learned that I should not assume the first answer is always correct.

I had to share actual error messages, compare the suggested code with my existing files and check whether changes affected other parts of the application.

The most important thing I learned from building TrustVault is that security needs more than a working interface. Document permissions must be checked on the server, access should stop when it is revoked, and audit records should be trustworthy.

I also understand that some security features still need verification. I should not claim that a feature is fully secure until I can demonstrate how it works and test what happens when an unauthorized user tries to bypass it.