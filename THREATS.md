# Threats & Security Notes

While building TrustVault, I tried to think about what could go wrong when people share private documents. I focused on who can access a file, what happens when access is removed, and whether we can check what happened later.

I used AI to help me build the application, but I also had to review errors and make changes when the generated code did not work as expected. These are the main security risks I considered and the limitations I know about.

## 1. Someone trying to download another person's document

**The problem:**

What if a user changes the document ID in the URL and tries to download a file that belongs to someone else?

**What I did:**

I added server-side checks in the document download route. The application checks the logged-in user and the document's ownership or access permission before returning the file. If the user does not have permission, the request is refused and an unauthorized attempt is logged.

I did not want to depend only on hiding the download button because someone could still try to access the URL directly.

**What still needs checking:**

The same access rules must be enforced for every route that reads, edits, deletes or shares a document. I need to verify those paths with automated tests rather than assume that the download check protects everything.

## 2. Access still working after it is removed

**The problem:**

If an owner removes a viewer's permission, that viewer should not be able to continue downloading the document using an old login session.

**What I did:**

The application checks document permissions against the database when a download is requested instead of relying only on the user's login token. This means that removing a permission can take effect on the next request.

**What I understand:**

A user who already downloaded or saved a copy of a document cannot be forced to forget that copy just because their permission was removed. TrustVault can prevent future authorized downloads, but it cannot retrieve files already saved outside the platform.

## 3. Unsafe files being uploaded

**The problem:**

Someone might upload an unsupported file or try to disguise a potentially harmful file as a normal document.

**What I did:**

I added upload validation for supported file types and a file-size limit. I also moved the application's upload process to Supabase Storage rather than depending on files saved to the local server, which may not persist reliably after deployment.

Uploaded files use generated filenames rather than relying on the original filename as the storage key.

**What I still need to be careful about:**

Checking a file's declared MIME type alone does not prove that its contents are safe. The upload route should also verify the actual file format. The current upload route uses a 10 MB limit, and the Supabase bucket must remain private so users cannot bypass application permissions through public file URLs.

## 4. Someone trying to change or remove permissions

**The problem:**

A viewer should not be able to give another person access to a document, change its contents, or remove someone else's permissions.

**What I did:**

TrustVault uses different roles and document-level permissions. The intended design is to grant access to named users instead of giving every logged-in user access to every document.

**What needs to be verified:**

The server must check the user's role, ownership and permission before every sensitive operation. A permission check in the interface alone is not enough. I also need to verify that revoking access removes the database permission and that a viewer cannot grant themselves additional access.

## 5. Audit logs being changed or deleted

**The problem:**

If a document is accessed without permission, the owner or administrator should be able to investigate what happened. An attacker should not be able to quietly erase evidence of an access attempt.

**What I did:**

I added audit logging for important document operations, including download attempts that are refused. The application also has an administrative view intended to display activity records.

**What I have not claimed:**

I have not verified that TrustVault currently implements a complete SHA-256 hash chain or another tamper-evident audit mechanism. A normal database audit table is not automatically immutable. Someone with sufficient database privileges could potentially change or delete records.

A stronger future improvement would be to protect the audit records from application-level modification, verify their integrity, and keep a separately protected copy of important security events.

## 6. Secrets or private storage being exposed

**The problem:**

If a Supabase service-role key is exposed, or if the storage bucket is public, someone might bypass the application's normal access checks.

**What I did:**

I configured the application to use server-side environment variables for its Supabase Storage connection. The service-role key should only be used on the server and must never be placed in frontend code or committed to a public repository.

**What still needs checking:**

The Supabase bucket must be private, and the repository history must not contain exposed credentials. I should verify the deployed environment settings and rotate any secret that was accidentally exposed.

## 7. Login sessions and inactive accounts

**The problem:**

A user should not be able to continue accessing documents after their account has been disabled. Session tokens should also not be readable by ordinary browser scripts.

**What I did:**

TrustVault uses server-side session utilities and a session cookie with security settings intended to protect the token. The application also checks the user's account status when resolving the current session.

**What still needs checking:**

I need to test logout, expired sessions and disabled accounts against the live application. Cookie settings alone do not guarantee that every authorization path is secure.

## 8. What I deliberately left for future improvement

TrustVault was built within a limited project period. I prioritized getting the application, authentication, document storage and permission checks working before attempting every possible enterprise security feature.

Some areas that need stronger verification or further work include:

- Automated tests for unauthorized reads, downloads, edits, deletions and permission changes.
- Tamper-evident audit records with an independent integrity check.
- Verification of uploaded file contents, not only the declared file type.
- Stronger protection and monitoring for audit records.
- Document recovery, version history and retention policies.

I do not consider these areas complete just because the application builds and deploys successfully.

## Conclusion

My main design decision was to make document access a server-side decision instead of trusting the frontend. I also used database permissions so that access can be checked again when a document is requested.

The biggest lesson I learned is that a working login does not automatically make a document-sharing platform secure. Every sensitive operation needs its own authorization check, and the security claims need to be tested rather than assumed.