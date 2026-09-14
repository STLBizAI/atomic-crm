-- Industry seed rows for STL Biz AI.
-- Segment values must match industries_segment_valid exactly;
-- a typo aborts the whole migration.

insert into public.industries (name, segment) values
    -- Trades & Home Services (joins Flooring and HVAC, already seeded)
    ('Commercial Cleaning',      'Trades & Home Services'),
    ('Electrical',               'Trades & Home Services'),
    ('Handyman',                 'Trades & Home Services'),
    ('Landscaping',              'Trades & Home Services'),
    ('Painting',                 'Trades & Home Services'),
    ('Pressure Washing',         'Trades & Home Services'),
    ('Remodeling',               'Trades & Home Services'),
    ('Restoration',              'Trades & Home Services'),
    ('Roofing',                  'Trades & Home Services'),
    ('Waterproofing',            'Trades & Home Services'),

    -- Professional Services
    ('Banking',                  'Professional Services'),
    ('Business Exit Planning',   'Professional Services'),
    ('E-Commerce',               'Professional Services'),
    ('IT & Managed Services',    'Professional Services'),
    ('Insurance',                'Professional Services'),
    ('Marketing & Social Media', 'Professional Services'),
    ('Mortgage',                 'Professional Services'),
    ('Payroll Services',         'Professional Services'),
    ('Wealth Management',        'Professional Services'),

    -- Real Estate & Property
    ('Commercial Real Estate',   'Real Estate & Property'),
    ('Property Management',      'Real Estate & Property'),
    ('Relocation',               'Real Estate & Property'),
    ('Residential Real Estate',  'Real Estate & Property'),

    -- Health & Personal Services (joins Fitness Studio, already seeded)
    ('Chiropractic',             'Health & Personal Services'),
    ('Dental',                   'Health & Personal Services'),

    -- Other (joins Telecommunications, already seeded)
    ('Office Furniture',         'Other');