INSERT INTO users (
    first_name, last_name, username, created_on, active, updated_on,
    address, city, state, zip, email, home_phone, cell_phone, office_phone,
    avatar, permission, account_id, cognito_id, tenant_id, verified, type, id
) VALUES
(
    'Tami', 'Trostel', 'tamitrostel', '2025-10-05', TRUE, '2026-04-13',
    '9971 Westwanda Dr', 'Beverly Hills', 'CA', '90210',
    'tamitrostel@gmail.com', NULL, '415-770-4411', NULL,
    'https://progress-report-images-bucket.s3.us-east-2.amazonaws.com/profile/5S3A1559.JPG',
    '1', '90580', 'e18b4560-50c1-7015-beb3-09b499b14974',
    'f49cc9ef-0190-4e43-a030-01817c0cbfc4', FALSE, '{TEACHER,ADMIN}', NULL
),
(
    'Michael', 'Trostel', 'octobercabbages', '2026-07-20', TRUE, '2026-07-20',
    '9971 Westwanda Dr', 'Beverly Hills', 'CA', '90210',
    'trostel4@gmail.com', NULL, '(415)741-9993', NULL,
    NULL, '1', '123', '819b5540-e031-7020-ef23-967a0cbf1d7c',
    'f49cc9ef-0190-4e43-a030-01817c0cbfc4', FALSE, '{USER}', NULL
);
