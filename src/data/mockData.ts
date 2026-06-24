import { EmailThread, KBSection, KBChunk, SettingsRule, KPIStats } from '../types';

export const INITIAL_THREADS: EmailThread[] = [
  {
    id: 'THR-001',
    senderName: 'Aman Verma',
    senderEmail: 'averma@gmail.com',
    topic: 'Mass gainer smells sour, is it spoiled?',
    category: 'Product Issue',
    sentiment: 'Frustrated',
    brief: 'Customer reports sour smell in Mass Gainer (Chocolate), batch #442.',
    draftStatus: 'Draft ready',
    status: 'Open',
    waitingTime: '2h active',
    orderId: 'BL10234',
    contactCount: 3,
    messages: [
      {
        id: 'msg-1',
        sender: 'Aman Verma',
        content: "Hi, my mass gainer arrived today but it has a very sour smell. I've bought the chocolate flavor many times before and it usually smells sweet. This one is almost acidic. Is it safe to use or has it spoiled during shipping?",
        timestamp: 'Yesterday, 2:45 PM',
        isCustomer: true
      },
      {
        id: 'msg-2',
        sender: 'Aman Verma',
        content: "Still waiting for a response. This is expensive and I don't want to use it if it's bad. I need to know if I can get a replacement soon as I'm out of my current tub.",
        timestamp: 'Today, 10:12 AM',
        isCustomer: true
      }
    ],
    triggerReason: 'High frustration sentiment & repeat contact'
  },
  {
    id: 'THR-002',
    senderName: 'Priya Sharma',
    senderEmail: 'priya.s@outlook.com',
    topic: 'Refund now or I file a consumer complaint',
    category: 'Legal',
    sentiment: 'Angry',
    brief: 'Customer threatening legal action over delayed refund.',
    draftStatus: 'Needs action',
    status: 'Escalated',
    waitingTime: '12m waiting',
    orderId: 'BL10892',
    contactCount: 1,
    messages: [
      {
        id: 'msg-3',
        sender: 'Priya Sharma',
        content: "Refund now or I file a consumer complaint. It has been 3 weeks since you confirmed receipt of my returned products and nothing has hit my account. My attorney advised me to draft a complaint to the state department if this is not processed in 24 hours.",
        timestamp: 'Today, 11:24 AM',
        isCustomer: true
      }
    ],
    triggerReason: 'Trigger: Legal keyword detected ("consumer complaint", "attorney")'
  },
  {
    id: 'THR-003',
    senderName: 'Rahul Khanna',
    senderEmail: 'rahul.k@corp.com',
    topic: 'Payment failed but money was deducted',
    category: 'Billing',
    sentiment: 'Neutral',
    brief: 'Transaction failed at checkout but amount debited from bank.',
    draftStatus: 'Draft ready',
    status: 'Open',
    waitingTime: '1h active',
    orderId: 'BL09841',
    contactCount: 2,
    messages: [
      {
        id: 'msg-4',
        sender: 'Rahul Khanna',
        content: "I tried to place an order for the Pre-Workout stack. The checkout page threw a generic transaction failure error, but my credit card company already sent a text notification that $89.00 was debited. Can you check if the order went through?",
        timestamp: 'Today, 9:15 AM',
        isCustomer: true
      }
    ]
  },
  {
    id: 'THR-004',
    senderName: 'Neha Iyer',
    senderEmail: 'neha_m@health.in',
    topic: 'Skin redness and itching after creatine',
    category: 'Product Issue',
    sentiment: 'Sad',
    brief: 'Possible allergic reaction reported after 3 days of use.',
    draftStatus: 'Needs action',
    status: 'Escalated',
    waitingTime: '45m waiting',
    orderId: 'BL10283',
    contactCount: 1,
    messages: [
      {
        id: 'msg-5',
        sender: 'Neha Iyer',
        content: "After taking your premium Micronized Creatine for 3 days, my skin has broken out in widespread red hives and is itching uncontrollably. I stopped taking it immediately. I don't have a history of dairy allergies. Is there some heavy metals or additives I should be aware of?",
        timestamp: 'Today, 10:40 AM',
        isCustomer: true
      }
    ],
    triggerReason: 'Trigger: Health / adverse reaction'
  },
  {
    id: 'THR-005',
    senderName: 'Karan Mehta',
    senderEmail: 'kt_lifts@yahoo.com',
    topic: 'Will protein help me lose weight?',
    category: 'General',
    sentiment: 'Neutral',
    brief: 'General inquiry about nutrition and weight loss goals.',
    draftStatus: 'Draft ready',
    status: 'Open',
    waitingTime: '2h active',
    orderId: 'BL10574',
    contactCount: 1,
    messages: [
      {
        id: 'msg-6',
        sender: 'Karan Mehta',
        content: "Hey, I've just started my fitness journey. I weigh 95kg and want to cut down. Should I be drinking double scoops of Iso-Whey? Or is protein powder only meant for serious bulkers? Let me know the daily target suggested for cutting.",
        timestamp: 'Today, 8:05 AM',
        isCustomer: true
      }
    ]
  },
  {
    id: 'THR-006',
    senderName: 'Sana Rao',
    senderEmail: 'sana.r@delivery-test.com',
    topic: 'Marked delivered but I never received it',
    category: 'Delivery',
    sentiment: 'Angry',
    brief: 'Package status shows delivered but customer reports non-receipt.',
    draftStatus: 'Draft prepared',
    status: 'Escalated',
    waitingTime: '1h waiting',
    orderId: 'BL11235',
    contactCount: 3,
    messages: [
      {
        id: 'msg-7',
        sender: 'Sana Rao',
        content: "The cargo delivery tracker says my box was delivered to the front desk at 2:00 PM yesterday. I've asked our leasing office and they confirmed no packages arrived. This is the 3rd time shipment has been lost. I need a tracing on this immediately.",
        timestamp: 'Today, 1:12 AM',
        isCustomer: true
      }
    ],
    triggerReason: 'Trigger: Angry + 3rd contact'
  },
  {
    id: 'THR-007',
    senderName: 'Vikram N',
    senderEmail: 'vikram.n@gmail.com',
    topic: 'Loved the cookies and cream whey!',
    category: 'Feedback',
    sentiment: 'Happy',
    brief: 'Positive feedback on flavor and mixability.',
    draftStatus: 'Draft ready',
    status: 'Open',
    waitingTime: '3h active',
    orderId: 'BL10940',
    contactCount: 1,
    messages: [
      {
        id: 'msg-8',
        sender: 'Vikram N',
        content: "Just wanted to say the Cookies and Cream whey is absolutely delicious. Hands down the best gourmet flavor on the market, mixes with hot and cold milk without a single lump. Kudos to the R&D team!",
        timestamp: 'Yesterday, 6:00 PM',
        isCustomer: true
      }
    ]
  },
  {
    id: 'THR-008',
    senderName: 'Elizabeth Banks',
    senderEmail: 'ebanks@platinum-gym.com',
    topic: 'Bulk gym order, need a GST invoice',
    category: 'Billing',
    sentiment: 'Neutral',
    brief: 'Bulk workout gear wholesale. Heavy commercial account query.',
    draftStatus: 'Draft prepared',
    status: 'Escalated',
    waitingTime: '2h waiting',
    orderId: 'BL20349',
    contactCount: 4,
    messages: [
      {
        id: 'msg-9',
        sender: 'Elizabeth Banks',
        content: "This is Elizabeth from Platinum Fitness. We placed a commercial order for 40 units of active barbell series and require a commercial tax breakdown invoice (GST/VAT) with our business registry number included.",
        timestamp: 'Today, 7:50 AM',
        isCustomer: true
      }
    ],
    triggerReason: 'Trigger: VIP Account (Platinum)'
  },
  {
    id: 'THR-009',
    senderName: 'Imran S',
    senderEmail: 'imran.s@gmail.com',
    topic: 'Attached my medical report, can I take this?',
    category: 'General',
    sentiment: 'Sad',
    brief: 'Customer wants clearance based on private health report.',
    draftStatus: 'Needs action',
    status: 'Escalated',
    waitingTime: '3h waiting',
    orderId: 'BL10023',
    contactCount: 1,
    messages: [
      {
        id: 'msg-10',
        sender: 'Imran S',
        content: "Hello, my doctor recently flagged an elevated creatinine and mild chronic kidney index (CKD) on my blood scans. I've attached my full medical PDF file. Can I still take your mass gainer or creatine daily without risk? Please review and let me know.",
        timestamp: 'Yesterday, 4:10 PM',
        isCustomer: true
      }
    ],
    triggerReason: 'Trigger: Attachment for review'
  }
];

export const INITIAL_KB_SECTIONS: KBSection[] = [
  {
    id: 'KB-SEC-01',
    title: 'About BeastLife',
    summary: 'Brand values, mission statement, and founding history...',
    category: 'General',
    articlesCount: 12,
    updatedTime: '2d ago'
  },
  {
    id: 'KB-SEC-02',
    title: 'Product Catalogue',
    summary: 'Full list of SKUs, ingredients, and pricing models...',
    category: 'Products',
    articlesCount: 84,
    updatedTime: '1h ago'
  },
  {
    id: 'KB-SEC-03',
    title: 'Protein Q&A',
    summary: 'Mixability, taste profiles, and recommended usage...',
    category: 'Support FAQ',
    articlesCount: 32,
    updatedTime: '5m ago'
  },
  {
    id: 'KB-SEC-04',
    title: 'Order & Delivery',
    summary: 'Shipping partners, ETA calculation, and tracking...',
    category: 'Logistics',
    articlesCount: 45,
    updatedTime: '3h ago'
  },
  {
    id: 'KB-SEC-05',
    title: 'Returns & Refunds',
    summary: 'Standard 30-day policy and exceptions for opened...',
    category: 'Returns',
    articlesCount: 18,
    updatedTime: '1d ago'
  },
  {
    id: 'KB-SEC-06',
    title: 'Payment',
    summary: 'Gateway issues, billing cycles, and B2B invoices...',
    category: 'Billing',
    articlesCount: 15,
    updatedTime: '4d ago'
  },
  {
    id: 'KB-SEC-07',
    title: 'Product Quality Issues',
    summary: 'Reporting contaminants, off-flavors, or damaged...',
    category: 'QC',
    articlesCount: 22,
    updatedTime: '6d ago'
  }
];

export const KB_CHUNKS: KBChunk[] = [
  {
    id: 'chunk-1',
    sourceId: 'BL-QA-2024-012',
    title: 'Whey Protein Formulation & Instantization',
    relevanceScore: 0.94,
    category: 'Protein Q&A / Mixability',
    text: '"...BeastLife Whey uses a multi-stage filtration process that may result in small protein clumps if added to boiling water. We recommend using water or milk under 45°C. To ensure total dissolution, use a shaker bottle with the included blending ball to break mechanical cohesion, as heat denaturation above 55°C triggers immediate coagulation..."'
  },
  {
    id: 'chunk-2',
    sourceId: 'BL-QC-2023-088',
    title: 'Isolate Moisture and Solidification Standards',
    relevanceScore: 0.82,
    category: 'Product Quality / Standards',
    text: '"...Lumping is a common physical characteristic of high-purity whey protein isolate when not stored in a cool, dry place. While aesthetic, it does not impact the biological nutrient value or safety of the product unless accompanied by a bitter/rancid odor, which signals fat oxidation. Standard batches must remain under 4.5% moisture content to prevent bacterial growth..."'
  },
  {
    id: 'chunk-3',
    sourceId: 'BL-CAT-WHEY-004',
    title: 'Emulsifier Agents & Lecithin Addition',
    relevanceScore: 0.76,
    category: 'Product Catalogue / Ingredients',
    text: '"Our protein powder includes a small amount of Sunflower Lecithin to aid in instantization. Users with mixability issues should check the expiration date on the bottom of the tub, as clumping naturally increases with age and exposure to high atmospheric humidity, causing the lecithin lipids to lose binding strength."'
  },
  {
    id: 'chunk-4',
    sourceId: 'BL-LAW-2025-002',
    title: 'Dispute Settlement and Mediation Guidelines',
    relevanceScore: 0.89,
    category: 'Legal / Complaints Policy',
    text: '"Our corporate policy flags any explicit threats of consumer complaint forum filings, Better Business Bureau arbitration, or attorney notification as a formal legal trigger. Upon activation, support representatives must flag the case as high priorities, restrict secondary automated drafts, and escalate immediately to Tier 3 human supervisors for guided legal review."'
  },
  {
    id: 'chunk-5',
    sourceId: 'BL-DEL-2024-055',
    title: 'Proof of Delivery and Courier Verification',
    relevanceScore: 0.91,
    category: 'Logistics / Non-Receipt',
    text: '"When a cargo tracker indicates successful delivery but the customer claims non-receipt, the primary step is GPS coordinate verification of the scan point from our delivery dispatch partners. Representatives should trace the container transit signature and require a delivery desk logs verification before reshipping high-value supplements."'
  }
];

export const INITIAL_RULES: SettingsRule[] = [
  {
    id: 'rule-1',
    title: 'Legal keyword detected',
    description: 'Automatically flag messages containing critical legal, compliance, or regulatory threat terms.',
    enabled: true,
    icon: 'policy',
    keywords: ['lawsuit', 'consumer complaint', 'attorney', 'GDPR', 'refund threat']
  },
  {
    id: 'rule-2',
    title: 'Angry AND 3rd+ contact',
    description: 'Escalate if customer sentiment classification is negative/angry and thread count is greater than two.',
    enabled: true,
    icon: 'mood_bad'
  },
  {
    id: 'rule-3',
    title: 'VIP sender',
    description: 'Prioritize and escalate cases originating from accounts with "VIP" or "Platinum" enterprise tags.',
    enabled: true,
    icon: 'grade'
  },
  {
    id: 'rule-4',
    title: 'Attachment needs review',
    description: 'Flag emails where attachments (images/PDFs) are uploaded but AI OCR confidence drops below 60%.',
    enabled: false,
    icon: 'attach_file'
  }
];

export const KPI_DATA: KPIStats = {
  received: { value: 4822, change: '+12%' },
  autoDrafted: { value: 4051, percentage: 84 },
  escalated: { value: 212, change: '-2%' },
  solved: { value: 4431, percentage: 92 },
  inQueue: { value: 84, status: 'Active' },
  avgResponse: { value: '14m', change: '-4m' }
};
