-- ============================================
-- ADDITIONAL SEED DATA: More Grants for Indian Startups
-- Run this after the initial seed.sql
-- ============================================

INSERT INTO grants (
  name, provider, provider_type, description, amount_min, amount_max,
  currency, deadline, url, sectors, stages, eligibility_criteria,
  application_questions, contact_email, is_active
) VALUES

-- Delhi Startup Policy Grant
(
  'Delhi Startup Policy Grant',
  'Delhi State Industrial Infrastructure Development Corporation',
  'government',
  'Under the Delhi Startup Policy, startups registered in Delhi can receive grants up to Rs 10 lakhs for product development and scaling. Also provides reimbursement for patent filing and quality certifications.',
  300000, -- 3 Lakhs
  1000000, -- 10 Lakhs
  'INR',
  NULL,
  'https://startup.delhi.gov.in/',
  ARRAY['technology', 'healthcare', 'education', 'fintech', 'manufacturing', 'retail'],
  ARRAY['prototype', 'mvp', 'early_revenue'],
  '{"incorporation_required": true, "states": ["Delhi"], "max_age_months": 60}',
  '[
    {"id": "del_1", "question": "Describe your startup and its innovation", "max_length": 1000, "required": true},
    {"id": "del_2", "question": "How does your startup benefit Delhi or address local challenges?", "max_length": 600, "required": true},
    {"id": "del_3", "question": "Current traction and milestones", "max_length": 500, "required": true},
    {"id": "del_4", "question": "Grant utilization plan", "max_length": 600, "required": true}
  ]',
  'startup@delhi.gov.in',
  true
),

-- Telangana Innovation Fund
(
  'T-Fund (Telangana Innovation Fund)',
  'Telangana State Innovation Cell (TSIC)',
  'government',
  'T-Fund supports innovative startups in Telangana with grants up to Rs 25 lakhs. Focus on technology-driven solutions with potential for job creation.',
  500000, -- 5 Lakhs
  2500000, -- 25 Lakhs
  'INR',
  NULL,
  'https://tsic.telangana.gov.in/',
  ARRAY['technology', 'healthcare', 'agriculture', 'fintech', 'cleantech', 'ai_ml'],
  ARRAY['prototype', 'mvp', 'early_revenue'],
  '{"incorporation_required": true, "states": ["Telangana"], "max_age_months": 84}',
  '[
    {"id": "tfund_1", "question": "Describe your startup and the problem it solves", "max_length": 1000, "required": true},
    {"id": "tfund_2", "question": "What is unique about your solution?", "max_length": 600, "required": true},
    {"id": "tfund_3", "question": "Market opportunity and growth potential", "max_length": 700, "required": true},
    {"id": "tfund_4", "question": "Job creation potential", "max_length": 400, "required": true}
  ]',
  'tsic@telangana.gov.in',
  true
),

-- Kerala Startup Mission IDEA Grant
(
  'KSUM IDEA Grant',
  'Kerala Startup Mission',
  'government',
  'IDEA Grant supports early-stage startups in Kerala with grants up to Rs 15 lakhs for idea validation, prototype development, and market testing.',
  300000, -- 3 Lakhs
  1500000, -- 15 Lakhs
  'INR',
  NULL,
  'https://startupmission.kerala.gov.in/',
  ARRAY['technology', 'healthcare', 'tourism', 'agriculture', 'biotechnology', 'cleantech'],
  ARRAY['idea', 'prototype', 'mvp'],
  '{"incorporation_required": false, "states": ["Kerala"]}',
  '[
    {"id": "ksum_1", "question": "Describe your startup idea and its innovation aspect", "max_length": 1000, "required": true},
    {"id": "ksum_2", "question": "Target market and customer segments", "max_length": 600, "required": true},
    {"id": "ksum_3", "question": "Development plan and timeline", "max_length": 600, "required": true},
    {"id": "ksum_4", "question": "Team composition and experience", "max_length": 500, "required": true}
  ]',
  'idea@startupmission.kerala.gov.in',
  true
),

-- Rajasthan iStart Grant
(
  'iStart Rajasthan Sustenance Allowance',
  'iStart Rajasthan',
  'government',
  'iStart provides sustenance allowance to founders of recognized startups in Rajasthan. Rs 20,000 per month for up to 2 years, plus grants up to Rs 20 lakhs.',
  480000, -- 4.8 Lakhs (sustenance)
  2000000, -- 20 Lakhs
  'INR',
  NULL,
  'https://istart.rajasthan.gov.in/',
  ARRAY['technology', 'handicrafts', 'tourism', 'agriculture', 'manufacturing', 'social_impact'],
  ARRAY['idea', 'prototype', 'mvp'],
  '{"incorporation_required": false, "states": ["Rajasthan"]}',
  '[
    {"id": "istart_1", "question": "Describe your startup and the innovation", "max_length": 1000, "required": true},
    {"id": "istart_2", "question": "How does it leverage Rajasthan opportunities or solve local problems?", "max_length": 600, "required": true},
    {"id": "istart_3", "question": "Current stage and progress", "max_length": 500, "required": true},
    {"id": "istart_4", "question": "Fund utilization plan", "max_length": 600, "required": true}
  ]',
  'support@istart.rajasthan.gov.in',
  true
),

-- Odisha Startup Grant
(
  'Odisha Startup Growth Fund',
  'Startup Odisha',
  'government',
  'Startup Odisha provides grants up to Rs 15 lakhs for innovative startups registered in Odisha. Additional support includes incubation and mentorship.',
  300000, -- 3 Lakhs
  1500000, -- 15 Lakhs
  'INR',
  NULL,
  'https://startupodisha.gov.in/',
  ARRAY['technology', 'healthcare', 'agriculture', 'fisheries', 'handicrafts', 'tourism'],
  ARRAY['prototype', 'mvp', 'early_revenue'],
  '{"incorporation_required": true, "states": ["Odisha"], "max_age_months": 84}',
  '[
    {"id": "od_1", "question": "Describe your startup and the problem being solved", "max_length": 1000, "required": true},
    {"id": "od_2", "question": "Market potential and competitive advantage", "max_length": 700, "required": true},
    {"id": "od_3", "question": "Team background and capabilities", "max_length": 500, "required": true},
    {"id": "od_4", "question": "Growth plan and milestones", "max_length": 600, "required": true}
  ]',
  'support@startupodisha.gov.in',
  true
),

-- Punjab Startup Scheme
(
  'Punjab Innovation Mission Grant',
  'Punjab State Council for Science & Technology',
  'government',
  'Supports innovative startups in Punjab with grants up to Rs 10 lakhs for prototype development and commercialization.',
  200000, -- 2 Lakhs
  1000000, -- 10 Lakhs
  'INR',
  NULL,
  'https://pbstartup.in/',
  ARRAY['technology', 'agriculture', 'food_processing', 'manufacturing', 'renewable_energy'],
  ARRAY['idea', 'prototype', 'mvp'],
  '{"incorporation_required": false, "states": ["Punjab"]}',
  '[
    {"id": "pun_1", "question": "Describe your innovation and its uniqueness", "max_length": 1000, "required": true},
    {"id": "pun_2", "question": "Market opportunity in Punjab and beyond", "max_length": 600, "required": true},
    {"id": "pun_3", "question": "Development roadmap", "max_length": 500, "required": true},
    {"id": "pun_4", "question": "Budget breakdown", "max_length": 400, "required": true}
  ]',
  'startup@punjab.gov.in',
  true
),

-- Tata Social Enterprise Challenge (CSR)
(
  'Tata Social Enterprise Challenge',
  'Tata Institute of Social Sciences',
  'csr',
  'Annual competition for social enterprises addressing critical social issues. Winners receive grants up to Rs 10 lakhs, mentorship, and access to Tata network.',
  300000, -- 3 Lakhs
  1000000, -- 10 Lakhs
  'INR',
  NULL,
  'https://tsec.tiss.edu/',
  ARRAY['social_impact', 'healthcare', 'education', 'rural_development', 'livelihoods', 'environment'],
  ARRAY['idea', 'prototype', 'mvp', 'early_revenue'],
  '{"incorporation_required": false}',
  '[
    {"id": "tata_1", "question": "Describe the social problem you are addressing", "max_length": 800, "required": true},
    {"id": "tata_2", "question": "How does your solution create social impact?", "max_length": 1000, "required": true},
    {"id": "tata_3", "question": "Business model and sustainability", "max_length": 700, "required": true},
    {"id": "tata_4", "question": "Impact metrics and measurement approach", "max_length": 600, "required": true},
    {"id": "tata_5", "question": "Team and their commitment to the cause", "max_length": 500, "required": true}
  ]',
  'tsec@tiss.edu',
  true
),

-- Infosys Foundation Grant (CSR)
(
  'Infosys Foundation Innovation Grant',
  'Infosys Foundation',
  'csr',
  'Supports social innovations in healthcare, education, and rural development. Grants up to Rs 50 lakhs for scalable solutions.',
  500000, -- 5 Lakhs
  5000000, -- 50 Lakhs
  'INR',
  NULL,
  'https://www.infosys.com/infosys-foundation/',
  ARRAY['healthcare', 'education', 'rural_development', 'environment', 'arts_culture'],
  ARRAY['mvp', 'early_revenue', 'growth'],
  '{"incorporation_required": true}',
  '[
    {"id": "info_1", "question": "Describe the social challenge and your solution", "max_length": 1000, "required": true},
    {"id": "info_2", "question": "Evidence of impact achieved so far", "max_length": 800, "required": true},
    {"id": "info_3", "question": "Scalability and replication potential", "max_length": 700, "required": true},
    {"id": "info_4", "question": "Financial sustainability model", "max_length": 600, "required": true}
  ]',
  'foundation@infosys.com',
  true
),

-- Mahindra Rise Prize (CSR)
(
  'Mahindra Rise Prize for Social Innovation',
  'Mahindra Group',
  'csr',
  'Annual prize for innovative solutions addressing mobility, rural prosperity, and sustainability. Prize money up to Rs 25 lakhs.',
  500000, -- 5 Lakhs
  2500000, -- 25 Lakhs
  'INR',
  NULL,
  'https://www.mahindra.com/rise-prize',
  ARRAY['mobility', 'agriculture', 'rural_development', 'cleantech', 'manufacturing'],
  ARRAY['prototype', 'mvp', 'early_revenue'],
  '{"incorporation_required": false}',
  '[
    {"id": "mah_1", "question": "Describe your innovation and how it aligns with Rise themes", "max_length": 1000, "required": true},
    {"id": "mah_2", "question": "Impact on rural India or sustainability", "max_length": 700, "required": true},
    {"id": "mah_3", "question": "Business model and scalability", "max_length": 600, "required": true},
    {"id": "mah_4", "question": "Partnerships and ecosystem support needed", "max_length": 500, "required": true}
  ]',
  'riseprize@mahindra.com',
  true
),

-- CSIR Innovation Award
(
  'CSIR Innovation Award for School Children & Students',
  'Council of Scientific and Industrial Research',
  'government',
  'CSIR encourages young innovators with awards and seed funding up to Rs 5 lakhs for promising inventions and innovations.',
  100000, -- 1 Lakh
  500000, -- 5 Lakhs
  'INR',
  NULL,
  'https://www.csir.res.in/',
  ARRAY['technology', 'healthcare', 'agriculture', 'environment', 'manufacturing'],
  ARRAY['idea', 'prototype'],
  '{"incorporation_required": false}',
  '[
    {"id": "csir_1", "question": "Describe your innovation and its scientific basis", "max_length": 1000, "required": true},
    {"id": "csir_2", "question": "What problem does it solve and for whom?", "max_length": 600, "required": true},
    {"id": "csir_3", "question": "Novelty and inventive step", "max_length": 500, "required": true},
    {"id": "csir_4", "question": "Development plan and resource requirements", "max_length": 500, "required": true}
  ]',
  'innovation@csir.res.in',
  true
),

-- ICAR Agri-Startup Grant
(
  'ICAR RKVY-RAFTAAR Agri Startup Grant',
  'Indian Council of Agricultural Research',
  'government',
  'Supports agri-tech startups with grants up to Rs 25 lakhs through RKVY-RAFTAAR scheme. Focus on innovations in agriculture, food processing, and allied sectors.',
  500000, -- 5 Lakhs
  2500000, -- 25 Lakhs
  'INR',
  NULL,
  'https://rkvy.nic.in/',
  ARRAY['agriculture', 'food_processing', 'dairy', 'fisheries', 'rural_development'],
  ARRAY['prototype', 'mvp', 'early_revenue'],
  '{"incorporation_required": true, "max_age_months": 60}',
  '[
    {"id": "icar_1", "question": "Describe your agri-innovation and its impact on farmers", "max_length": 1000, "required": true},
    {"id": "icar_2", "question": "Technical feasibility and validation status", "max_length": 700, "required": true},
    {"id": "icar_3", "question": "Market potential and go-to-market strategy", "max_length": 700, "required": true},
    {"id": "icar_4", "question": "Team expertise in agriculture sector", "max_length": 500, "required": true}
  ]',
  'raftaar@icar.gov.in',
  true
),

-- Smart India Hackathon Winner Grant
(
  'Smart India Hackathon Innovation Grant',
  'Ministry of Education',
  'government',
  'SIH winners receive implementation grants up to Rs 10 lakhs to develop their hackathon solutions into market-ready products.',
  200000, -- 2 Lakhs
  1000000, -- 10 Lakhs
  'INR',
  NULL,
  'https://sih.gov.in/',
  ARRAY['technology', 'healthcare', 'education', 'governance', 'agriculture', 'energy', 'mobility'],
  ARRAY['idea', 'prototype'],
  '{"incorporation_required": false}',
  '[
    {"id": "sih_1", "question": "Describe your hackathon solution", "max_length": 800, "required": true},
    {"id": "sih_2", "question": "How will you develop it into a market-ready product?", "max_length": 700, "required": true},
    {"id": "sih_3", "question": "Implementation timeline and milestones", "max_length": 600, "required": true},
    {"id": "sih_4", "question": "Budget breakdown", "max_length": 400, "required": true}
  ]',
  'sih@aicte-india.org',
  true
),

-- ISRO Startup Grant
(
  'ISRO Space Technology Cell Grant',
  'Indian Space Research Organisation',
  'government',
  'ISRO supports space-tech startups through its Space Technology Cells at IITs. Grants up to Rs 50 lakhs for space technology applications.',
  1000000, -- 10 Lakhs
  5000000, -- 50 Lakhs
  'INR',
  NULL,
  'https://www.isro.gov.in/',
  ARRAY['spacetech', 'satellite', 'remote_sensing', 'navigation', 'communication'],
  ARRAY['prototype', 'mvp'],
  '{"incorporation_required": false}',
  '[
    {"id": "isro_1", "question": "Describe your space technology innovation", "max_length": 1000, "required": true},
    {"id": "isro_2", "question": "Applications and market potential", "max_length": 700, "required": true},
    {"id": "isro_3", "question": "Technical development plan", "max_length": 800, "required": true},
    {"id": "isro_4", "question": "Team expertise and facilities available", "max_length": 500, "required": true}
  ]',
  'stc@isro.gov.in',
  true
),

-- Social Alpha Grant
(
  'Social Alpha TATA STRIVE Grant',
  'Social Alpha (Tata Trusts)',
  'csr',
  'Social Alpha supports science and technology innovations for social good. Grants up to Rs 30 lakhs along with incubation support.',
  500000, -- 5 Lakhs
  3000000, -- 30 Lakhs
  'INR',
  NULL,
  'https://socialalpha.org/',
  ARRAY['healthcare', 'agriculture', 'cleantech', 'education', 'livelihoods', 'water_sanitation'],
  ARRAY['prototype', 'mvp', 'early_revenue'],
  '{"incorporation_required": false}',
  '[
    {"id": "sa_1", "question": "Describe the social/environmental challenge and your solution", "max_length": 1000, "required": true},
    {"id": "sa_2", "question": "Science and technology basis of your innovation", "max_length": 700, "required": true},
    {"id": "sa_3", "question": "Impact potential and measurement approach", "max_length": 700, "required": true},
    {"id": "sa_4", "question": "Path to sustainability and scale", "max_length": 600, "required": true}
  ]',
  'applications@socialalpha.org',
  true
),

-- Villgro INVENT Grant
(
  'Villgro INVENT Grant',
  'Villgro Innovations Foundation',
  'csr',
  'INVENT supports early-stage social enterprises with grants up to Rs 20 lakhs and comprehensive incubation support.',
  300000, -- 3 Lakhs
  2000000, -- 20 Lakhs
  'INR',
  NULL,
  'https://villgro.org/',
  ARRAY['healthcare', 'agriculture', 'education', 'energy', 'livelihoods'],
  ARRAY['prototype', 'mvp', 'early_revenue'],
  '{"incorporation_required": false}',
  '[
    {"id": "vil_1", "question": "Describe your social enterprise and theory of change", "max_length": 1000, "required": true},
    {"id": "vil_2", "question": "Target beneficiaries and impact achieved", "max_length": 700, "required": true},
    {"id": "vil_3", "question": "Business model and revenue streams", "max_length": 600, "required": true},
    {"id": "vil_4", "question": "Support needed beyond funding", "max_length": 500, "required": true}
  ]',
  'invent@villgro.org',
  true
);

-- Log additional seed completion
DO $$
BEGIN
  RAISE NOTICE 'Additional seed data inserted: 15 more grants added (total: 27 grants)';
END $$;
