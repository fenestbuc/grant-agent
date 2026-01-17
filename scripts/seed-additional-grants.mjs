#!/usr/bin/env node
/**
 * Script to seed additional grants via Supabase REST API
 * Run with: node scripts/seed-additional-grants.mjs
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const additionalGrants = [
  {
    name: 'Delhi Startup Policy Grant',
    provider: 'Delhi State Industrial Infrastructure Development Corporation',
    provider_type: 'government',
    description: 'Under the Delhi Startup Policy, startups registered in Delhi can receive grants up to Rs 10 lakhs for product development and scaling. Also provides reimbursement for patent filing and quality certifications.',
    amount_min: 300000,
    amount_max: 1000000,
    currency: 'INR',
    deadline: null,
    url: 'https://startup.delhi.gov.in/',
    sectors: ['technology', 'healthcare', 'education', 'fintech', 'manufacturing', 'retail'],
    stages: ['prototype', 'mvp', 'early_revenue'],
    eligibility_criteria: { incorporation_required: true, states: ['Delhi'], max_age_months: 60 },
    application_questions: [
      { id: 'del_1', question: 'Describe your startup and its innovation', max_length: 1000, required: true },
      { id: 'del_2', question: 'How does your startup benefit Delhi or address local challenges?', max_length: 600, required: true },
      { id: 'del_3', question: 'Current traction and milestones', max_length: 500, required: true },
      { id: 'del_4', question: 'Grant utilization plan', max_length: 600, required: true }
    ],
    contact_email: 'startup@delhi.gov.in',
    is_active: true
  },
  {
    name: 'T-Fund (Telangana Innovation Fund)',
    provider: 'Telangana State Innovation Cell (TSIC)',
    provider_type: 'government',
    description: 'T-Fund supports innovative startups in Telangana with grants up to Rs 25 lakhs. Focus on technology-driven solutions with potential for job creation.',
    amount_min: 500000,
    amount_max: 2500000,
    currency: 'INR',
    deadline: null,
    url: 'https://tsic.telangana.gov.in/',
    sectors: ['technology', 'healthcare', 'agriculture', 'fintech', 'cleantech', 'ai_ml'],
    stages: ['prototype', 'mvp', 'early_revenue'],
    eligibility_criteria: { incorporation_required: true, states: ['Telangana'], max_age_months: 84 },
    application_questions: [
      { id: 'tfund_1', question: 'Describe your startup and the problem it solves', max_length: 1000, required: true },
      { id: 'tfund_2', question: 'What is unique about your solution?', max_length: 600, required: true },
      { id: 'tfund_3', question: 'Market opportunity and growth potential', max_length: 700, required: true },
      { id: 'tfund_4', question: 'Job creation potential', max_length: 400, required: true }
    ],
    contact_email: 'tsic@telangana.gov.in',
    is_active: true
  },
  {
    name: 'KSUM IDEA Grant',
    provider: 'Kerala Startup Mission',
    provider_type: 'government',
    description: 'IDEA Grant supports early-stage startups in Kerala with grants up to Rs 15 lakhs for idea validation, prototype development, and market testing.',
    amount_min: 300000,
    amount_max: 1500000,
    currency: 'INR',
    deadline: null,
    url: 'https://startupmission.kerala.gov.in/',
    sectors: ['technology', 'healthcare', 'tourism', 'agriculture', 'biotechnology', 'cleantech'],
    stages: ['idea', 'prototype', 'mvp'],
    eligibility_criteria: { incorporation_required: false, states: ['Kerala'] },
    application_questions: [
      { id: 'ksum_1', question: 'Describe your startup idea and its innovation aspect', max_length: 1000, required: true },
      { id: 'ksum_2', question: 'Target market and customer segments', max_length: 600, required: true },
      { id: 'ksum_3', question: 'Development plan and timeline', max_length: 600, required: true },
      { id: 'ksum_4', question: 'Team composition and experience', max_length: 500, required: true }
    ],
    contact_email: 'idea@startupmission.kerala.gov.in',
    is_active: true
  },
  {
    name: 'iStart Rajasthan Sustenance Allowance',
    provider: 'iStart Rajasthan',
    provider_type: 'government',
    description: 'iStart provides sustenance allowance to founders of recognized startups in Rajasthan. Rs 20,000 per month for up to 2 years, plus grants up to Rs 20 lakhs.',
    amount_min: 480000,
    amount_max: 2000000,
    currency: 'INR',
    deadline: null,
    url: 'https://istart.rajasthan.gov.in/',
    sectors: ['technology', 'handicrafts', 'tourism', 'agriculture', 'manufacturing', 'social_impact'],
    stages: ['idea', 'prototype', 'mvp'],
    eligibility_criteria: { incorporation_required: false, states: ['Rajasthan'] },
    application_questions: [
      { id: 'istart_1', question: 'Describe your startup and the innovation', max_length: 1000, required: true },
      { id: 'istart_2', question: 'How does it leverage Rajasthan opportunities or solve local problems?', max_length: 600, required: true },
      { id: 'istart_3', question: 'Current stage and progress', max_length: 500, required: true },
      { id: 'istart_4', question: 'Fund utilization plan', max_length: 600, required: true }
    ],
    contact_email: 'support@istart.rajasthan.gov.in',
    is_active: true
  },
  {
    name: 'Odisha Startup Growth Fund',
    provider: 'Startup Odisha',
    provider_type: 'government',
    description: 'Startup Odisha provides grants up to Rs 15 lakhs for innovative startups registered in Odisha. Additional support includes incubation and mentorship.',
    amount_min: 300000,
    amount_max: 1500000,
    currency: 'INR',
    deadline: null,
    url: 'https://startupodisha.gov.in/',
    sectors: ['technology', 'healthcare', 'agriculture', 'fisheries', 'handicrafts', 'tourism'],
    stages: ['prototype', 'mvp', 'early_revenue'],
    eligibility_criteria: { incorporation_required: true, states: ['Odisha'], max_age_months: 84 },
    application_questions: [
      { id: 'od_1', question: 'Describe your startup and the problem being solved', max_length: 1000, required: true },
      { id: 'od_2', question: 'Market potential and competitive advantage', max_length: 700, required: true },
      { id: 'od_3', question: 'Team background and capabilities', max_length: 500, required: true },
      { id: 'od_4', question: 'Growth plan and milestones', max_length: 600, required: true }
    ],
    contact_email: 'support@startupodisha.gov.in',
    is_active: true
  },
  {
    name: 'Punjab Innovation Mission Grant',
    provider: 'Punjab State Council for Science & Technology',
    provider_type: 'government',
    description: 'Supports innovative startups in Punjab with grants up to Rs 10 lakhs for prototype development and commercialization.',
    amount_min: 200000,
    amount_max: 1000000,
    currency: 'INR',
    deadline: null,
    url: 'https://pbstartup.in/',
    sectors: ['technology', 'agriculture', 'food_processing', 'manufacturing', 'renewable_energy'],
    stages: ['idea', 'prototype', 'mvp'],
    eligibility_criteria: { incorporation_required: false, states: ['Punjab'] },
    application_questions: [
      { id: 'pun_1', question: 'Describe your innovation and its uniqueness', max_length: 1000, required: true },
      { id: 'pun_2', question: 'Market opportunity in Punjab and beyond', max_length: 600, required: true },
      { id: 'pun_3', question: 'Development roadmap', max_length: 500, required: true },
      { id: 'pun_4', question: 'Budget breakdown', max_length: 400, required: true }
    ],
    contact_email: 'startup@punjab.gov.in',
    is_active: true
  },
  {
    name: 'Tata Social Enterprise Challenge',
    provider: 'Tata Institute of Social Sciences',
    provider_type: 'csr',
    description: 'Annual competition for social enterprises addressing critical social issues. Winners receive grants up to Rs 10 lakhs, mentorship, and access to Tata network.',
    amount_min: 300000,
    amount_max: 1000000,
    currency: 'INR',
    deadline: null,
    url: 'https://tsec.tiss.edu/',
    sectors: ['social_impact', 'healthcare', 'education', 'rural_development', 'livelihoods', 'environment'],
    stages: ['idea', 'prototype', 'mvp', 'early_revenue'],
    eligibility_criteria: { incorporation_required: false },
    application_questions: [
      { id: 'tata_1', question: 'Describe the social problem you are addressing', max_length: 800, required: true },
      { id: 'tata_2', question: 'How does your solution create social impact?', max_length: 1000, required: true },
      { id: 'tata_3', question: 'Business model and sustainability', max_length: 700, required: true },
      { id: 'tata_4', question: 'Impact metrics and measurement approach', max_length: 600, required: true },
      { id: 'tata_5', question: 'Team and their commitment to the cause', max_length: 500, required: true }
    ],
    contact_email: 'tsec@tiss.edu',
    is_active: true
  },
  {
    name: 'Infosys Foundation Innovation Grant',
    provider: 'Infosys Foundation',
    provider_type: 'csr',
    description: 'Supports social innovations in healthcare, education, and rural development. Grants up to Rs 50 lakhs for scalable solutions.',
    amount_min: 500000,
    amount_max: 5000000,
    currency: 'INR',
    deadline: null,
    url: 'https://www.infosys.com/infosys-foundation/',
    sectors: ['healthcare', 'education', 'rural_development', 'environment', 'arts_culture'],
    stages: ['mvp', 'early_revenue', 'growth'],
    eligibility_criteria: { incorporation_required: true },
    application_questions: [
      { id: 'info_1', question: 'Describe the social challenge and your solution', max_length: 1000, required: true },
      { id: 'info_2', question: 'Evidence of impact achieved so far', max_length: 800, required: true },
      { id: 'info_3', question: 'Scalability and replication potential', max_length: 700, required: true },
      { id: 'info_4', question: 'Financial sustainability model', max_length: 600, required: true }
    ],
    contact_email: 'foundation@infosys.com',
    is_active: true
  },
  {
    name: 'Mahindra Rise Prize for Social Innovation',
    provider: 'Mahindra Group',
    provider_type: 'csr',
    description: 'Annual prize for innovative solutions addressing mobility, rural prosperity, and sustainability. Prize money up to Rs 25 lakhs.',
    amount_min: 500000,
    amount_max: 2500000,
    currency: 'INR',
    deadline: null,
    url: 'https://www.mahindra.com/rise-prize',
    sectors: ['mobility', 'agriculture', 'rural_development', 'cleantech', 'manufacturing'],
    stages: ['prototype', 'mvp', 'early_revenue'],
    eligibility_criteria: { incorporation_required: false },
    application_questions: [
      { id: 'mah_1', question: 'Describe your innovation and how it aligns with Rise themes', max_length: 1000, required: true },
      { id: 'mah_2', question: 'Impact on rural India or sustainability', max_length: 700, required: true },
      { id: 'mah_3', question: 'Business model and scalability', max_length: 600, required: true },
      { id: 'mah_4', question: 'Partnerships and ecosystem support needed', max_length: 500, required: true }
    ],
    contact_email: 'riseprize@mahindra.com',
    is_active: true
  },
  {
    name: 'CSIR Innovation Award for School Children & Students',
    provider: 'Council of Scientific and Industrial Research',
    provider_type: 'government',
    description: 'CSIR encourages young innovators with awards and seed funding up to Rs 5 lakhs for promising inventions and innovations.',
    amount_min: 100000,
    amount_max: 500000,
    currency: 'INR',
    deadline: null,
    url: 'https://www.csir.res.in/',
    sectors: ['technology', 'healthcare', 'agriculture', 'environment', 'manufacturing'],
    stages: ['idea', 'prototype'],
    eligibility_criteria: { incorporation_required: false },
    application_questions: [
      { id: 'csir_1', question: 'Describe your innovation and its scientific basis', max_length: 1000, required: true },
      { id: 'csir_2', question: 'What problem does it solve and for whom?', max_length: 600, required: true },
      { id: 'csir_3', question: 'Novelty and inventive step', max_length: 500, required: true },
      { id: 'csir_4', question: 'Development plan and resource requirements', max_length: 500, required: true }
    ],
    contact_email: 'innovation@csir.res.in',
    is_active: true
  },
  {
    name: 'ICAR RKVY-RAFTAAR Agri Startup Grant',
    provider: 'Indian Council of Agricultural Research',
    provider_type: 'government',
    description: 'Supports agri-tech startups with grants up to Rs 25 lakhs through RKVY-RAFTAAR scheme. Focus on innovations in agriculture, food processing, and allied sectors.',
    amount_min: 500000,
    amount_max: 2500000,
    currency: 'INR',
    deadline: null,
    url: 'https://rkvy.nic.in/',
    sectors: ['agriculture', 'food_processing', 'dairy', 'fisheries', 'rural_development'],
    stages: ['prototype', 'mvp', 'early_revenue'],
    eligibility_criteria: { incorporation_required: true, max_age_months: 60 },
    application_questions: [
      { id: 'icar_1', question: 'Describe your agri-innovation and its impact on farmers', max_length: 1000, required: true },
      { id: 'icar_2', question: 'Technical feasibility and validation status', max_length: 700, required: true },
      { id: 'icar_3', question: 'Market potential and go-to-market strategy', max_length: 700, required: true },
      { id: 'icar_4', question: 'Team expertise in agriculture sector', max_length: 500, required: true }
    ],
    contact_email: 'raftaar@icar.gov.in',
    is_active: true
  },
  {
    name: 'Smart India Hackathon Innovation Grant',
    provider: 'Ministry of Education',
    provider_type: 'government',
    description: 'SIH winners receive implementation grants up to Rs 10 lakhs to develop their hackathon solutions into market-ready products.',
    amount_min: 200000,
    amount_max: 1000000,
    currency: 'INR',
    deadline: null,
    url: 'https://sih.gov.in/',
    sectors: ['technology', 'healthcare', 'education', 'governance', 'agriculture', 'energy', 'mobility'],
    stages: ['idea', 'prototype'],
    eligibility_criteria: { incorporation_required: false },
    application_questions: [
      { id: 'sih_1', question: 'Describe your hackathon solution', max_length: 800, required: true },
      { id: 'sih_2', question: 'How will you develop it into a market-ready product?', max_length: 700, required: true },
      { id: 'sih_3', question: 'Implementation timeline and milestones', max_length: 600, required: true },
      { id: 'sih_4', question: 'Budget breakdown', max_length: 400, required: true }
    ],
    contact_email: 'sih@aicte-india.org',
    is_active: true
  },
  {
    name: 'ISRO Space Technology Cell Grant',
    provider: 'Indian Space Research Organisation',
    provider_type: 'government',
    description: 'ISRO supports space-tech startups through its Space Technology Cells at IITs. Grants up to Rs 50 lakhs for space technology applications.',
    amount_min: 1000000,
    amount_max: 5000000,
    currency: 'INR',
    deadline: null,
    url: 'https://www.isro.gov.in/',
    sectors: ['spacetech', 'satellite', 'remote_sensing', 'navigation', 'communication'],
    stages: ['prototype', 'mvp'],
    eligibility_criteria: { incorporation_required: false },
    application_questions: [
      { id: 'isro_1', question: 'Describe your space technology innovation', max_length: 1000, required: true },
      { id: 'isro_2', question: 'Applications and market potential', max_length: 700, required: true },
      { id: 'isro_3', question: 'Technical development plan', max_length: 800, required: true },
      { id: 'isro_4', question: 'Team expertise and facilities available', max_length: 500, required: true }
    ],
    contact_email: 'stc@isro.gov.in',
    is_active: true
  },
  {
    name: 'Social Alpha TATA STRIVE Grant',
    provider: 'Social Alpha (Tata Trusts)',
    provider_type: 'csr',
    description: 'Social Alpha supports science and technology innovations for social good. Grants up to Rs 30 lakhs along with incubation support.',
    amount_min: 500000,
    amount_max: 3000000,
    currency: 'INR',
    deadline: null,
    url: 'https://socialalpha.org/',
    sectors: ['healthcare', 'agriculture', 'cleantech', 'education', 'livelihoods', 'water_sanitation'],
    stages: ['prototype', 'mvp', 'early_revenue'],
    eligibility_criteria: { incorporation_required: false },
    application_questions: [
      { id: 'sa_1', question: 'Describe the social/environmental challenge and your solution', max_length: 1000, required: true },
      { id: 'sa_2', question: 'Science and technology basis of your innovation', max_length: 700, required: true },
      { id: 'sa_3', question: 'Impact potential and measurement approach', max_length: 700, required: true },
      { id: 'sa_4', question: 'Path to sustainability and scale', max_length: 600, required: true }
    ],
    contact_email: 'applications@socialalpha.org',
    is_active: true
  },
  {
    name: 'Villgro INVENT Grant',
    provider: 'Villgro Innovations Foundation',
    provider_type: 'csr',
    description: 'INVENT supports early-stage social enterprises with grants up to Rs 20 lakhs and comprehensive incubation support.',
    amount_min: 300000,
    amount_max: 2000000,
    currency: 'INR',
    deadline: null,
    url: 'https://villgro.org/',
    sectors: ['healthcare', 'agriculture', 'education', 'energy', 'livelihoods'],
    stages: ['prototype', 'mvp', 'early_revenue'],
    eligibility_criteria: { incorporation_required: false },
    application_questions: [
      { id: 'vil_1', question: 'Describe your social enterprise and theory of change', max_length: 1000, required: true },
      { id: 'vil_2', question: 'Target beneficiaries and impact achieved', max_length: 700, required: true },
      { id: 'vil_3', question: 'Business model and revenue streams', max_length: 600, required: true },
      { id: 'vil_4', question: 'Support needed beyond funding', max_length: 500, required: true }
    ],
    contact_email: 'invent@villgro.org',
    is_active: true
  }
];

async function seedGrants() {
  console.log('Seeding additional grants...');

  const { data, error } = await supabase
    .from('grants')
    .insert(additionalGrants)
    .select('id, name');

  if (error) {
    console.error('Error seeding grants:', error);
    process.exit(1);
  }

  console.log(`Successfully inserted ${data.length} grants:`);
  data.forEach(grant => console.log(`  - ${grant.name}`));

  // Get total count
  const { count } = await supabase
    .from('grants')
    .select('*', { count: 'exact', head: true });

  console.log(`\nTotal grants in database: ${count}`);
}

seedGrants();
