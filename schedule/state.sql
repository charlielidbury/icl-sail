DELETE FROM leaderboard;

DELETE FROM raceteam;

DELETE FROM race;

DELETE FROM halfflight;

DELETE FROM team;

INSERT INTO halfflight (id, name, numbers) VALUES
('b3cba9a8-ce41-4b11-9398-6daaef8944cf', 'Pink Stripe', ARRAY[7,8,9]),
('941e26df-3fd7-4834-920a-4bf7dc45251e', 'Black Stripe', ARRAY[10,11,12]),
('2de8ed23-67e5-44cb-b8d9-9b677b6a08e7', 'Green Circle', ARRAY[7,8,9]),
('eb207b6f-45cd-497c-a573-d147b495ad89', 'Black Diamond', ARRAY[10,11,12]),
('a47be11e-0e5a-48e9-8a08-40f66491825d', 'Red Striped Jibs', ARRAY[1,2,3]),
('a9c17d18-dfc3-43cf-ab78-a79cff6f58dc', 'Blue Striped Jibs', ARRAY[4,5,6]),
('e990e56c-a49a-4579-ba88-c1e45a27ede6', 'Red Jib', ARRAY[1,2,3]),
('f9d93cfa-eb58-4eed-9303-920b5be45bea', 'Blue Jib', ARRAY[4,5,6]);

INSERT INTO team (id, name) VALUES
('f3eaa4ea-a381-41a8-8ef7-187a186fb147', 'Plymouth Black'),
('a1b97e30-acdc-43bb-8a97-3b90a711e621', 'TCD'),
('cae241ba-6d6b-4e2d-824a-6e1bd0d2e46b', 'Solent Black'),
('3ee306cc-85b0-4922-9850-b8bd093e705a', 'Portsmouth Brown'),
('34792536-e90e-4962-bb53-a36536e1a701', 'Portsmouth Blue'),
('9a7833c6-1f42-4939-8f65-b1402d6372f9', 'Bath Glossy White'),
('0ebbbff9-777d-43f4-b502-a98e49b3ff9a', 'Bath Matte Black'),
('ef37de89-efc5-4f94-8d4f-be00db314755', 'UCD'),
('61d7916a-4383-4216-847f-510828c5904f', 'Rutland Rockets'),
('05c61be7-8fd3-4018-a996-d604e7be10cd', 'Sevenoaks Pirate Hawks'),
('685fea21-a003-47fa-a038-0e0168313226', 'Emirates Team Kickflip'),
('d0e28fe5-7425-4e1d-b613-9c6666aec0fa', 'Northern RoyalT'),
('e46cfbd7-c24c-4a29-8149-5f3208eb728c', 'Imperial White'),
('9cdbcb61-5aec-4dff-8d7f-642bf661a6e4', 'Brunel Blue'),
('a7e433e1-61bc-4327-ad0c-5a09ad8ccf89', 'UCL Purple'),
('6198c2b0-45d1-4ebf-a1e5-9ab5e5e2186f', 'UCLove'),
('4bdb7ce5-ad0e-4e29-92cc-8f353e04f00f', 'Cambridge Green'),
('c3e58ae7-b99c-453d-85bd-7d016d7fd788', 'Oxford'),
('0a9f55b2-1e08-40e6-b051-bfb721832815', 'Durham White'),
('33fd2a10-68b0-4685-9835-ef5cf06048ac', 'Durham Bubblegum Pink');

