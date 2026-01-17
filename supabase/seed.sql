-- ============================================
-- SEED DATA: Government Grants for Indian Startups
-- ============================================

INSERT INTO grants (
  name, provider, provider_type, description, amount_min, amount_max,
  currency, deadline, url, sectors, stages, eligibility_criteria,
  application_questions, contact_email, is_active
) VALUES

-- SISFS - Startup India Seed Fund Scheme
(
  'Startup India Seed Fund Scheme (SISFS)',
  'Department for Promotion of Industry and Internal Trade (DPIIT)',
  'government',
  'The Startup India Seed Fund Scheme aims to provide financial assistance to startups for proof of concept, prototype development, product trials, market entry, and commercialization. The scheme supports startups through incubators across India.',
  2000000, -- 20 Lakhs
  5000000, -- 50 Lakhs
  'INR',
  NULL, -- Rolling deadline
  'https://seedfund.startupindia.gov.in/',
  ARRAY['technology', 'healthcare', 'agriculture', 'education', 'fintech', 'cleantech', 'manufacturing', 'social_impact'],
  ARRAY['prototype', 'mvp', 'early_revenue'],
  '{"incorporation_required": true, "dpiit_required": true, "max_age_months": 24, "entity_types": ["private_limited", "llp", "partnership"]}',
  '[
    {"id": "sisfs_1", "question": "Describe your product/service and the problem it solves", "max_length": 1000, "required": true},
    {"id": "sisfs_2", "question": "What is your business model and revenue strategy?", "max_length": 800, "required": true},
    {"id": "sisfs_3", "question": "Describe your team and their relevant experience", "max_length": 600, "required": true},
    {"id": "sisfs_4", "question": "What is your current traction (users, revenue, partnerships)?", "max_length": 500, "required": true},
    {"id": "sisfs_5", "question": "How will you use the seed fund? Provide a detailed breakdown", "max_length": 800, "required": true}
  ]',
  'sisfs@startupindia.gov.in',
  true
),

-- NIDHI PRAYAS
(
  'NIDHI-PRAYAS (Promoting and Accelerating Young and Aspiring Innovators)',
  'Department of Science & Technology (DST)',
  'government',
  'NIDHI-PRAYAS supports innovators and startups to transform their ideas into prototype. It provides grant-in-aid up to Rs 10 lakhs for developing prototypes and proof of concept.',
  500000, -- 5 Lakhs
  1000000, -- 10 Lakhs
  'INR',
  NULL,
  'https://nidhi.dst.gov.in/schemes-programmes/nidhiprayas/',
  ARRAY['technology', 'healthcare', 'agriculture', 'energy', 'manufacturing', 'environment'],
  ARRAY['idea', 'prototype'],
  '{"incorporation_required": false, "max_age_months": 12}',
  '[
    {"id": "prayas_1", "question": "Describe your innovation idea and its novelty", "max_length": 1000, "required": true},
    {"id": "prayas_2", "question": "What problem does your innovation solve? Who are the beneficiaries?", "max_length": 800, "required": true},
    {"id": "prayas_3", "question": "Describe the technical feasibility and development plan", "max_length": 800, "required": true},
    {"id": "prayas_4", "question": "What is the market potential and commercialization strategy?", "max_length": 600, "required": true}
  ]',
  'nidhi-prayas@dst.gov.in',
  true
),

-- NIDHI SSS
(
  'NIDHI-SSS (Seed Support System)',
  'Department of Science & Technology (DST)',
  'government',
  'NIDHI-SSS provides seed support to incubatee startups for initial investment to startups with innovative ideas, products, processes or services. The grant can be up to Rs 1 crore.',
  2500000, -- 25 Lakhs
  10000000, -- 1 Crore
  'INR',
  NULL,
  'https://nidhi.dst.gov.in/schemes-programmes/nidhisss/',
  ARRAY['technology', 'healthcare', 'agriculture', 'energy', 'manufacturing', 'ict'],
  ARRAY['prototype', 'mvp', 'early_revenue'],
  '{"incorporation_required": true, "max_age_months": 36}',
  '[
    {"id": "sss_1", "question": "Describe your startup and the innovation", "max_length": 1000, "required": true},
    {"id": "sss_2", "question": "What is the market size and your go-to-market strategy?", "max_length": 800, "required": true},
    {"id": "sss_3", "question": "Describe your competitive advantage and IP position", "max_length": 600, "required": true},
    {"id": "sss_4", "question": "Provide financial projections for the next 3 years", "max_length": 800, "required": true},
    {"id": "sss_5", "question": "How will the seed support be utilized?", "max_length": 600, "required": true}
  ]',
  'nidhi-sss@dst.gov.in',
  true
),

-- BIRAC BIG Grant
(
  'BIRAC BIG (Biotechnology Ignition Grant)',
  'Biotechnology Industry Research Assistance Council (BIRAC)',
  'government',
  'BIG scheme supports startups and entrepreneurs with innovative ideas relevant to the biotech sector. Grant of up to Rs 50 lakhs for proof of concept and early-stage development.',
  2500000, -- 25 Lakhs
  5000000, -- 50 Lakhs
  'INR',
  NULL,
  'https://birac.nic.in/big.php',
  ARRAY['healthcare', 'agriculture', 'cleantech', 'biotechnology'],
  ARRAY['idea', 'prototype', 'mvp'],
  '{"incorporation_required": false}',
  '[
    {"id": "big_1", "question": "Describe the biotech innovation and its scientific basis", "max_length": 1500, "required": true},
    {"id": "big_2", "question": "What is the unmet need being addressed?", "max_length": 800, "required": true},
    {"id": "big_3", "question": "Describe the development milestones and timeline", "max_length": 800, "required": true},
    {"id": "big_4", "question": "What is the IP strategy?", "max_length": 500, "required": true},
    {"id": "big_5", "question": "Team composition and relevant experience", "max_length": 600, "required": true}
  ]',
  'big@birac.nic.in',
  true
),

-- Maharashtra Startup Week Grant
(
  'Maharashtra Startup Yatra Grant',
  'Maharashtra State Innovation Society (MSInS)',
  'government',
  'Grant support for innovative startups registered in Maharashtra. Provides funding up to Rs 15 lakhs along with incubation support and mentorship.',
  500000, -- 5 Lakhs
  1500000, -- 15 Lakhs
  'INR',
  NULL,
  'https://msins.in/',
  ARRAY['technology', 'healthcare', 'agriculture', 'education', 'fintech', 'manufacturing'],
  ARRAY['idea', 'prototype', 'mvp'],
  '{"incorporation_required": false, "states": ["Maharashtra"]}',
  '[
    {"id": "msy_1", "question": "Describe your startup idea and innovation", "max_length": 1000, "required": true},
    {"id": "msy_2", "question": "How does it benefit Maharashtra or address state-specific challenges?", "max_length": 600, "required": true},
    {"id": "msy_3", "question": "What is your current stage and achievements?", "max_length": 500, "required": true},
    {"id": "msy_4", "question": "Funding requirement and utilization plan", "max_length": 600, "required": true}
  ]',
  'info@msins.in',
  true
),

-- Karnataka Elevate
(
  'Karnataka Elevate 100',
  'Karnataka Startup Cell',
  'government',
  'Elevate 100 identifies and supports 100 most innovative startups in Karnataka each year with grants, mentorship, and networking opportunities. Grant support up to Rs 50 lakhs.',
  1000000, -- 10 Lakhs
  5000000, -- 50 Lakhs
  'INR',
  NULL,
  'https://startup.karnataka.gov.in/',
  ARRAY['technology', 'healthcare', 'agriculture', 'fintech', 'cleantech', 'social_impact'],
  ARRAY['prototype', 'mvp', 'early_revenue'],
  '{"incorporation_required": true, "states": ["Karnataka"], "max_age_months": 84}',
  '[
    {"id": "ke_1", "question": "Describe your product/service and unique value proposition", "max_length": 1000, "required": true},
    {"id": "ke_2", "question": "What is the market opportunity and your traction so far?", "max_length": 800, "required": true},
    {"id": "ke_3", "question": "How will this grant accelerate your growth?", "max_length": 600, "required": true},
    {"id": "ke_4", "question": "Team background and execution capability", "max_length": 500, "required": true}
  ]',
  'startup@karnataka.gov.in',
  true
),

-- Gujarat Startup Fund
(
  'Gujarat Student Startup and Innovation Policy (SSIP) Grant',
  'Gujarat Knowledge Society',
  'government',
  'Supports student and young entrepreneurs in Gujarat with grants for innovation and startup development. Individual grants up to Rs 10 lakhs.',
  200000, -- 2 Lakhs
  1000000, -- 10 Lakhs
  'INR',
  NULL,
  'https://ssipgujarat.in/',
  ARRAY['technology', 'healthcare', 'agriculture', 'education', 'manufacturing'],
  ARRAY['idea', 'prototype'],
  '{"incorporation_required": false, "states": ["Gujarat"]}',
  '[
    {"id": "ssip_1", "question": "Describe your innovative idea and its novelty", "max_length": 800, "required": true},
    {"id": "ssip_2", "question": "What problem does it solve and for whom?", "max_length": 600, "required": true},
    {"id": "ssip_3", "question": "Development plan and milestones", "max_length": 600, "required": true},
    {"id": "ssip_4", "question": "Budget breakdown", "max_length": 400, "required": true}
  ]',
  'ssip@gujrat.gov.in',
  true
),

-- Tamil Nadu TANSEED
(
  'TANSEED (Tamil Nadu Startup Seed Grant Fund)',
  'StartupTN',
  'government',
  'TANSEED provides seed grants to innovative startups registered in Tamil Nadu. Grants range from Rs 10 lakhs to Rs 1 crore based on stage and potential.',
  1000000, -- 10 Lakhs
  10000000, -- 1 Crore
  'INR',
  NULL,
  'https://startuptn.in/tanseed/',
  ARRAY['technology', 'healthcare', 'agriculture', 'fintech', 'cleantech', 'manufacturing', 'spacetech'],
  ARRAY['prototype', 'mvp', 'early_revenue'],
  '{"incorporation_required": true, "states": ["Tamil Nadu"], "dpiit_required": true}',
  '[
    {"id": "tan_1", "question": "Describe your startup and the innovation", "max_length": 1000, "required": true},
    {"id": "tan_2", "question": "Market size and competitive landscape", "max_length": 800, "required": true},
    {"id": "tan_3", "question": "Current traction and milestones achieved", "max_length": 600, "required": true},
    {"id": "tan_4", "question": "Revenue model and financial projections", "max_length": 700, "required": true},
    {"id": "tan_5", "question": "Grant utilization plan", "max_length": 500, "required": true}
  ]',
  'tanseed@startuptn.in',
  true
),

-- HDFC SmartUp Grant (CSR)
(
  'HDFC Bank SmartUp Grant',
  'HDFC Bank CSR',
  'csr',
  'HDFC SmartUp provides grants to social enterprises and startups working on sustainable development goals. Annual grants up to Rs 15 crores distributed among selected startups.',
  1000000, -- 10 Lakhs
  15000000, -- 1.5 Crores
  'INR',
  NULL,
  'https://hdfcbank.com/smartup',
  ARRAY['social_impact', 'healthcare', 'education', 'agriculture', 'fintech', 'cleantech'],
  ARRAY['mvp', 'early_revenue', 'growth'],
  '{"incorporation_required": true, "max_age_months": 120}',
  '[
    {"id": "hdfc_1", "question": "Describe your social enterprise and impact model", "max_length": 1000, "required": true},
    {"id": "hdfc_2", "question": "What SDGs does your startup address?", "max_length": 600, "required": true},
    {"id": "hdfc_3", "question": "Quantify the social impact achieved so far", "max_length": 800, "required": true},
    {"id": "hdfc_4", "question": "Financial sustainability and revenue model", "max_length": 700, "required": true},
    {"id": "hdfc_5", "question": "How will the grant help scale your impact?", "max_length": 600, "required": true}
  ]',
  'smartup@hdfcbank.com',
  true
),

-- Atal Innovation Mission (AIM) Grant
(
  'Atal New India Challenge (ANIC)',
  'Atal Innovation Mission, NITI Aayog',
  'government',
  'ANIC invites startups to solve sectoral challenges of national importance. Winners receive grants up to Rs 1 crore along with mentorship and market access support.',
  2500000, -- 25 Lakhs
  10000000, -- 1 Crore
  'INR',
  NULL,
  'https://aim.gov.in/atal-new-india-challenge.php',
  ARRAY['technology', 'healthcare', 'agriculture', 'energy', 'mobility', 'spacetech', 'defence'],
  ARRAY['prototype', 'mvp', 'early_revenue'],
  '{"incorporation_required": true}',
  '[
    {"id": "anic_1", "question": "Which challenge are you addressing and why?", "max_length": 800, "required": true},
    {"id": "anic_2", "question": "Describe your solution and its technical feasibility", "max_length": 1000, "required": true},
    {"id": "anic_3", "question": "What is your competitive advantage?", "max_length": 600, "required": true},
    {"id": "anic_4", "question": "Implementation plan and milestones", "max_length": 800, "required": true},
    {"id": "anic_5", "question": "Team capabilities and past experience", "max_length": 500, "required": true}
  ]',
  'anic@aim.gov.in',
  true
),

-- Women Entrepreneurship Platform Grant
(
  'WEP Startup Grant for Women Entrepreneurs',
  'NITI Aayog Women Entrepreneurship Platform',
  'government',
  'Special grant program for women-led startups. Provides funding, mentorship, and access to networks. Grants up to Rs 30 lakhs.',
  500000, -- 5 Lakhs
  3000000, -- 30 Lakhs
  'INR',
  NULL,
  'https://wep.gov.in/',
  ARRAY['technology', 'healthcare', 'agriculture', 'education', 'fintech', 'social_impact', 'fashion', 'food'],
  ARRAY['idea', 'prototype', 'mvp', 'early_revenue'],
  '{"incorporation_required": false, "women_led": true}',
  '[
    {"id": "wep_1", "question": "Describe your business and the problem you are solving", "max_length": 1000, "required": true},
    {"id": "wep_2", "question": "Your journey as a woman entrepreneur", "max_length": 600, "required": true},
    {"id": "wep_3", "question": "Current stage and achievements", "max_length": 500, "required": true},
    {"id": "wep_4", "question": "How will this grant help you grow?", "max_length": 600, "required": true}
  ]',
  'wep@niti.gov.in',
  true
),

-- MeitY Startup Hub Grant
(
  'MeitY Startup Hub (MSH) Ideation Grant',
  'Ministry of Electronics and IT',
  'government',
  'Supports tech startups in emerging areas like AI, ML, IoT, Blockchain, Cybersecurity. Grants up to Rs 25 lakhs for early-stage startups.',
  500000, -- 5 Lakhs
  2500000, -- 25 Lakhs
  'INR',
  NULL,
  'https://meitystartuphub.in/',
  ARRAY['technology', 'fintech', 'healthtech', 'edtech', 'cybersecurity', 'ai_ml', 'iot', 'blockchain'],
  ARRAY['idea', 'prototype', 'mvp'],
  '{"incorporation_required": false}',
  '[
    {"id": "msh_1", "question": "Describe the technology innovation and its applications", "max_length": 1000, "required": true},
    {"id": "msh_2", "question": "What emerging technology domain does it belong to?", "max_length": 400, "required": true},
    {"id": "msh_3", "question": "Technical architecture and development roadmap", "max_length": 800, "required": true},
    {"id": "msh_4", "question": "Market potential and commercialization plan", "max_length": 600, "required": true}
  ]',
  'msh@meity.gov.in',
  true
);

-- Log seed completion
DO $$
BEGIN
  RAISE NOTICE 'Seed data inserted: 12 grants added';
END $$;
