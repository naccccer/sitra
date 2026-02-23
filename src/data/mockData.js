export const initialCatalog = {
  roundStep: 1000,
  factoryLimits: { maxWidth: 321, maxHeight: 600 },
  thicknesses: [4, 5, 6, 8, 10, 12],
  glasses: [
    { id: '1', title: 'فلوت', process: 'raw', prices: { 4: 120000, 5: 150000, 6: 180000, 8: 250000, 10: 320000 } },
    { id: '2', title: 'فلوت', process: 'sekurit', prices: { 4: 180000, 5: 220000, 6: 270000, 8: 380000, 10: 480000 } },
    { id: '3', title: 'سوپر کلیر', process: 'raw', prices: { 4: 160000, 5: 200000, 6: 240000 } },
    { id: '4', title: 'سوپر کلیر', process: 'sekurit', prices: { 4: 240000, 5: 300000, 6: 360000 } },
    { id: '5', title: 'برنز', process: 'raw', prices: { 4: 140000, 6: 210000 } },
  ],
  connectors: {
    spacers: [
      { id: 'sp10', title: 'اسپیسر 10', price: 20000, unit: 'm_length' },
      { id: 'sp12', title: 'اسپیسر 12', price: 25000, unit: 'm_length' },
      { id: 'sp14', title: 'اسپیسر 14', price: 30000, unit: 'm_length' }
    ],
    interlayers: [
      { id: 'pvb038', title: 'طلق PVB 0.38', price: 180000, unit: 'm_square' },
      { id: 'pvb076', title: 'طلق PVB 0.76', price: 350000, unit: 'm_square' },
      { id: 'eva_smart', title: 'طلق هوشمند', price: 8000000, unit: 'm_square' }
    ]
  },
  operations: [
    { id: 'op_hole1', title: 'سوراخ مته ۲۰', price: 15000, unit: 'qty', iconFile: 'hole1.svg', isActive: true, sortOrder: 1 },
    { id: 'op_hole2', title: 'سوراخ گردبر ۵۰', price: 25000, unit: 'qty', iconFile: 'hole2.svg', isActive: true, sortOrder: 2 },
    { id: 'op_hinge1', title: 'جاساز لولا دیوار', price: 50000, unit: 'qty', iconFile: 'hinge1.svg', isActive: true, sortOrder: 3 },
    { id: 'op_other1', title: 'جاساز قفل کمری', price: 45000, unit: 'qty', iconFile: 'other1.svg', isActive: true, sortOrder: 4 }
  ],
  fees: {
    doubleGlazing: { price: 80000, unit: 'm_square', fixedOrderPrice: 50000 },
    laminating: { price: 120000, unit: 'm_square', fixedOrderPrice: 70000 },
    edgeWork: { unit: 'm_length', price: 0 },
    pattern: { price: 150000, unit: 'order' }
  },
  pvbLogic: [
    { id: 'pvbL1', minTotalThickness: 0, maxTotalThickness: 10, defaultInterlayerId: 'pvb038' },
    { id: 'pvbL2', minTotalThickness: 11, maxTotalThickness: 20, defaultInterlayerId: 'pvb076' }
  ],
  jumboRules: [
    { id: 'j1', minDim: 250, maxDim: 320, type: 'percentage', value: 15 },
    { id: 'j2', minDim: 321, maxDim: 0, type: 'fixed', value: 500000 }
  ]
};

export const initialOrders = [
  { 
    id: '1001', 
    orderCode: '021105-00-001-4',
    customerName: 'محمد رضایی', 
    phone: '09121112222', 
    date: '1402/11/05', 
    total: 2150000, 
    status: 'pending', 
    items: [
      { id: '1', title: 'شیشه تک جداره', dimensions: { width: 100, height: 100, count: 2 }, totalPrice: 2150000, unitPrice: 1075000, activeTab: 'single', config: { thick: 6, isSekurit: true, hasEdge: true, glassId: '2' }, operations: {'op_hole1': 1}, pattern: {type: 'none'} }
    ]
  }
];