INSERT INTO "User" ("id", "email", "passwordHash", "fullName", "role", "createdAt", "updatedAt") 
VALUES ('admin-001', 'admin@nineveh.edu', '$2a$10$zgZ6PnPazj2HqiRFHGsdDeqmQqXNQG30h4tewBFOpioIT/91hocei', 'مدير المدرسة', 'ADMIN', NOW(), NOW()) 
ON CONFLICT ("email") DO NOTHING;
