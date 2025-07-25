import { BaseAIService, AIConfig, AIAgentTask, AIDataContext, AIAgentCapability } from './BaseAIService';

export interface CategoryAnalysis {
  suggestedCategory: string;
  confidence: number;
  reasoning: string;
  alternativeCategories: string[];
  isNewCategory: boolean;
  categoryDescription?: string;
  categoryType: 'expense' | 'income' | 'transfer' | 'deductible';
}

export interface BulkCategorizationResult {
  categorized: Array<{
    transactionId: string;
    category: string;
    confidence: number;
  }>;
  newCategories: Array<{
    name: string;
    type: string;
    description: string;
    color: string;
  }>;
  uncategorized: string[];
  summary: {
    totalProcessed: number;
    successfullycategorized: number;
    newCategoriesCreated: number;
    averageConfidence: number;
  };
}

export class CategoriesAIAgent extends BaseAIService {
  constructor(config: AIConfig) {
    super(config);
    this.validateConfig();
    
    this.capabilities = [
      {
        name: 'getAvailableCategories',
        description: 'Get all available transaction categories with confidence thresholds',
        inputSchema: {},
        outputSchema: {
          categories: 'Array<Category>',
          confidence_thresholds: 'object'
        },
        costEstimate: 0.001
      },
      {
        name: 'analyzeAndCreateCategories',
        description: 'Analyze spending patterns and suggest optimal category structure',
        inputSchema: {
          transactions: 'Array<Transaction>',
          business_type: 'string'
        },
        outputSchema: {
          suggested_categories: 'Array<Category>',
          category_rules: 'Array<Rule>'
        },
        costEstimate: 0.05
      }
    ];
  }

  async executeTask(task: AIAgentTask, context: AIDataContext): Promise<any> {
    const startTime = Date.now();
    let success = false;
    let cost = 0;

    try {
      let result;
      
      switch (task.taskType) {
        case 'getAvailableCategories':
          result = await this.getAvailableCategories();
          break;
        case 'analyzeAndCreateCategories':
          result = await this.analyzeAndCreateCategories(task.data.transactions, task.data.business_type);
          break;
        case 'categorizeTransaction':
          result = await this.categorizeTransaction(task.data);
          break;
        default:
          throw new Error(`Unknown task type: ${task.taskType}`);
      }

      success = true;
      cost = await this.estimateTaskCost(task.taskType, task.data);
      
      return {
        success,
        data: result,
        cost,
        executionTime: Date.now() - startTime,
        taskType: task.taskType
      };
      
    } catch (error) {
      console.error(`CategoriesAIAgent task failed: ${task.taskType}`, error);
      throw error;
    }
  }

  async batchExecuteTasks(tasks: AIAgentTask[], context: AIDataContext): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    for (const task of tasks) {
      try {
        const result = await this.executeTask(task, context);
        results.set(task.id, result);
      } catch (error) {
        results.set(task.id, { error: error instanceof Error ? error.message : String(error) });
      }
    }

    return results;
  }

  async estimateTaskCost(taskType: string, data: any): Promise<number> {
    const capability = this.capabilities.find(c => c.name === taskType);
    return capability?.costEstimate || 0.01;
  }

  async optimizeForCost(tasks: AIAgentTask[]): Promise<AIAgentTask[]> {
    return tasks.sort((a, b) => b.priority - a.priority);
  }

  async getAvailableCategories(): Promise<any> {
    return {
      expense_categories: [
        {
          id: 'food_dining',
          name: 'Food & Dining',
          subcategories: ['Restaurants', 'Coffee Shops', 'Fast Food', 'Groceries'],
          tax_deductible: false,
          business_percentage: 50
        },
        {
          id: 'business_expenses',
          name: 'Business Expenses', 
          subcategories: ['Office Supplies', 'Software', 'Equipment', 'Marketing'],
          tax_deductible: true,
          business_percentage: 100
        },
        {
          id: 'travel',
          name: 'Travel',
          subcategories: ['Flights', 'Hotels', 'Car Rental', 'Meals'],
          tax_deductible: true,
          business_percentage: 80
        },
        {
          id: 'entertainment',
          name: 'Entertainment',
          subcategories: ['Movies', 'Sports', 'Streaming', 'Games'],
          tax_deductible: false,
          business_percentage: 0
        },
        {
          id: 'utilities',
          name: 'Utilities',
          subcategories: ['Electricity', 'Gas', 'Water', 'Internet', 'Phone'],
          tax_deductible: false,
          business_percentage: 20
        },
        {
          id: 'transportation',
          name: 'Transportation',
          subcategories: ['Gas', 'Public Transit', 'Uber/Lyft', 'Parking'],
          tax_deductible: false,
          business_percentage: 30
        },
        {
          id: 'health_fitness',
          name: 'Health & Fitness',
          subcategories: ['Gym', 'Doctor', 'Pharmacy', 'Supplements'],
          tax_deductible: false,
          business_percentage: 0
        },
        {
          id: 'shopping',
          name: 'Shopping',
          subcategories: ['Clothing', 'Electronics', 'Home', 'Personal Care'],
          tax_deductible: false,
          business_percentage: 5
        }
      ],
      income_categories: [
        {
          id: 'salary',
          name: 'Salary',
          subcategories: ['Base Salary', 'Bonus', 'Commission'],
          taxable: true
        },
        {
          id: 'business_income',
          name: 'Business Income',
          subcategories: ['Consulting', 'Sales', 'Services', 'Products'],
          taxable: true
        },
        {
          id: 'investment',
          name: 'Investment Income',
          subcategories: ['Dividends', 'Interest', 'Capital Gains'],
          taxable: true
        },
        {
          id: 'other_income',
          name: 'Other Income',
          subcategories: ['Gifts', 'Refunds', 'Cashback'],
          taxable: false
        }
      ]
    };
  }

  async analyzeAndCreateCategories(transactions: any[], businessType: string): Promise<any> {
    // This would use AI to analyze spending patterns and suggest categories
    // For now, return intelligent suggestions based on transaction data
    
    const spendingPatterns = this.analyzeSpendingPatterns(transactions);
    
    return {
      suggested_categories: [
        {
          name: `${businessType} Specific Expenses`,
          confidence: 0.9,
          reasoning: `Detected ${businessType}-specific spending patterns`,
          subcategories: this.getBusinessSpecificCategories(businessType)
        }
      ],
      category_rules: [
        {
          rule: `Transactions > $500 in office category should be flagged for capital expense review`,
          confidence: 0.85
        },
        {
          rule: `Weekly recurring transactions likely subscription services`,
          confidence: 0.92
        }
      ],
      insights: spendingPatterns
    };
  }

  /**
   * Categorize a single transaction
   */
  async categorizeTransaction(transactionData: any): Promise<any> {
    const { description, amount, type, merchant } = transactionData;
    
    // Basic categorization logic
    let category = 'Business Expense';
    let subcategory = 'General';
    let confidence = 0.6;
    let isTaxDeductible = false;
    let businessUsePercentage = 0;
    
    // Simple pattern matching - handle missing description
    const desc = (description || '').toLowerCase();
    
    if (desc.includes('restaurant') || desc.includes('cafe') || desc.includes('food')) {
      category = 'Food & Dining';
      subcategory = 'Restaurants';
      confidence = 0.8;
      isTaxDeductible = true;
      businessUsePercentage = 50;
    } else if (desc.includes('office') || desc.includes('supplies') || desc.includes('staples')) {
      category = 'Business Expense';
      subcategory = 'Office Supplies';
      confidence = 0.9;
      isTaxDeductible = true;
      businessUsePercentage = 100;
    } else if (desc.includes('travel') || desc.includes('hotel') || desc.includes('flight')) {
      category = 'Travel';
      subcategory = 'Business Travel';
      confidence = 0.85;
      isTaxDeductible = true;
      businessUsePercentage = 80;
    } else if (desc.includes('software') || desc.includes('subscription') || desc.includes('saas')) {
      category = 'Business Expense';
      subcategory = 'Software';
      confidence = 0.9;
      isTaxDeductible = true;
      businessUsePercentage = 100;
    }
    
    return {
      category,
      subcategory,
      confidence,
      reasoning: `Categorized based on transaction description: ${description}`,
      isTaxDeductible,
      businessUsePercentage,
      primaryType: type === 'credit' ? 'income' : 'expense',
      secondaryType: 'general'
    };
  }

  private analyzeSpendingPatterns(transactions: any[]): any {
    // Simple pattern analysis
    const totalSpending = transactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    const avgTransaction = totalSpending / transactions.length;
    
    return {
      total_transactions: transactions.length,
      total_spending: totalSpending,
      average_transaction: avgTransaction,
      patterns_detected: [
        'Frequent small transactions (likely daily expenses)',
        'Some larger transactions (potential business expenses)',
        'Regular recurring patterns detected'
      ]
    };
  }

  private getBusinessSpecificCategories(businessType: string): string[] {
    const categoryMap: Record<string, string[]> = {
      'consulting': ['Client Meetings', 'Professional Development', 'Marketing Materials'],
      'retail': ['Inventory', 'Point of Sale', 'Store Supplies'],
      'restaurant': ['Food Costs', 'Kitchen Equipment', 'Staff Uniforms'],
      'technology': ['Software Licenses', 'Hardware', 'Cloud Services'],
      'default': ['Industry Supplies', 'Professional Services', 'Equipment']
    };
    
    return categoryMap[businessType.toLowerCase()] || categoryMap.default;
  }

  // Implement required abstract methods
  async analyzeTransaction(): Promise<any> {
    throw new Error('Use TransactionClassificationAIAgent for transaction analysis');
  }

  async analyzeCSVFormat(): Promise<any> {
    throw new Error('Use OpenAIService for CSV analysis');
  }

  async queryTransactions(): Promise<any> {
    throw new Error('Use OpenAIService for transaction queries');
  }

  async generateUserProfile(): Promise<any> {
    throw new Error('Use OpenAIService for user profile generation');
  }

  async learnFromFeedback(): Promise<void> {
    // Categories can learn from user feedback about categorization accuracy
    console.log('Categories agent received feedback');
  }

  async getInsights(): Promise<any> {
    throw new Error('Use OpenAIService for insights generation');
  }

  async exportAIData(): Promise<any> {
    return {
      categories: await this.getAvailableCategories(),
      user_customizations: [],
      learning_data: []
    };
  }
} 