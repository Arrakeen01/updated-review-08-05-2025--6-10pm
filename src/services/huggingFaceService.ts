import { HfInference } from '@huggingface/inference';
import { securityService } from './securityService';

interface HuggingFaceResult {
  extractedText: string;
  documentType: string;
  extractedData: any;
  confidence: number;
  processingTime: number;
  stampVerification?: {
    isPresent: boolean;
    confidence: number;
  };
  signatureVerification?: {
    isPresent: boolean;
    confidence: number;
  };
}

// Document parsing prompt as specified in requirements
const DOCUMENT_PARSING_PROMPT = {
  prompt: "You are a precise document parser. Use only your built-in vision model capabilities to detect and extract text from documents, including handwritten or signature sections. Do NOT use external OCR engines. Extract only the fields defined below for each document type using visible text, stamp areas, and handwriting within the image. If names or dates are written near or inside the signature, extract them using your visual understanding. Never infer or hallucinate missing values. Return your response in pure JSON. Use temperature 0.3 for consistent outputs.",
  temperature: 0.3,
  document_parsing_instructions: [
    {
      document_type: "Earned Leave",
      json_format: {
        "Document Type": "Earned Leave",
        "Solution": {
          "R c No.": "",
          "H.O.D No.": "",
          "PC No.": "",
          "Name": "",
          "Date": "",
          "Number of Days": "",
          "Leave From Date": "",
          "Leave To Date": "",
          "Leave Reason": ""
        },
        "Stamp": {
          "Stamp Validation": "",
          "Signature": {
            "Name (if written)": "",
            "Date (if written)": ""
          }
        },
        "Document Status": ""
      }
    },
    {
      document_type: "Medical Leave",
      json_format: {
        "Document Type": "Medical Leave",
        "Solution": {
          "Name": "",
          "Date of Submission": "",
          "Coy Belongs to": "",
          "Rank": "",
          "Leave Reason": "",
          "HC No": "",
          "Phone Number": "",
          "Unit and District": {
            "Values": "",
            "Validation": ""
          }
        },
        "Stamp": {
          "Stamp Validation": "",
          "Signature": {
            "Name (if written)": "",
            "Date (if written)": ""
          }
        },
        "Document Status": ""
      }
    },
    {
      document_type: "Probation Letter",
      json_format: {
        "Document Type": "Probation Letter",
        "Solution": {
          "Service Class Category": "",
          "Name of Probationer": "",
          "Date of Regularization": "",
          "Date of completion of probation": "",
          "Period of Probation Prescribed": "",
          "Number of days Leave Taken During Probation": "",
          "Tests to be Passed During Probation": "",
          "Punishments During Probation": "",
          "Pending PR/OE": "",
          "Character and Conduct": "",
          "Firing Practice Completed": "",
          "Remarks of I/C Officer": "",
          "Remarks of Commandant": "",
          "Remarks of DIG": "",
          "ADGP Orders": "",
          "Probation extended for": "",
          "Date of Birth": "",
          "Salary": "",
          "Qualification": "",
          "Acceptance of Self Appraisal Report – Part-I": "",
          "Assessment of Officer's Performance During the Year": "",
          "Reporting Officer": {
            "Date": "",
            "Name": "",
            "Designation": ""
          },
          "Countersigning Officer": {
            "Date": "",
            "Name": "",
            "Designation": "",
            "Remarks": ""
          },
          "Head of Department Opinion": {
            "Opinion": "",
            "Date": "",
            "Name": "",
            "Designation": ""
          }
        },
        "Stamps and Signatures": [
          {
            "Stamp Validation": "",
            "Signature": {
              "Name (if written)": "",
              "Date (if written)": ""
            }
          }
        ],
        "Document Status": ""
      }
    },
    {
      document_type: "Punishment Letter",
      json_format: {
        "Document Type": "Punishment Letter",
        "Solution": {
          "R c. No": "",
          "D. O No": "",
          "Order_date": "",
          "Punishment_awarded": "",
          "Deliquency_Description": "",
          "Issued By": "",
          "Issued Date": ""
        },
        "Signature": {
          "Name (if written)": "",
          "Date (if written)": ""
        },
        "Document Status": ""
      }
    },
    {
      document_type: "Reward Letter",
      json_format: {
        "Document Type": "Reward Letter",
        "Solution": {
          "R c No": "",
          "H. O. O No": "",
          "Date": "",
          "Issued By": "",
          "Subject": "",
          "Reference Orders": [],
          "Reward Details": [
            {
              "Rank": "",
              "Name": "",
              "Reward": ""
            }
          ],
          "Reason for Reward": ""
        },
        "Stamp": {
          "Stamp Validation": "",
          "Signature": {
            "Name (if written)": "",
            "Date (if written)": ""
          }
        },
        "Document Status": ""
      }
    }
  ],
  instructions: [
    "Identify the document type before parsing.",
    "Use only your vision model's internal text and handwriting recognition to extract information.",
    "Do not use external OCR systems.",
    "Leave any missing or unreadable fields blank.",
    "Return only a clean, parsable JSON. Do not include any explanation or commentary.",
    "All date fields must follow the dd-mm-yyyy format, if readable."
  ]
};

class HuggingFaceService {
  private hf: HfInference;
  private modelId = 'Qwen/Qwen2.5-VL-7B-Instruct';

  constructor() {
    const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error('Hugging Face API key is required');
    }
    this.hf = new HfInference(apiKey);
  }

  async processDocument(file: File, userId: string): Promise<HuggingFaceResult> {
    const startTime = Date.now();

    try {
      // Log processing start
      securityService.logAction(
        userId,
        'huggingface_processing_start',
        'document',
        file.name,
        { 
          fileSize: file.size, 
          fileType: file.type,
          model: this.modelId
        }
      );

      // Convert file to base64
      const base64Data = await this.fileToBase64(file);

      // Create the full prompt with document parsing instructions
      const fullPrompt = `${DOCUMENT_PARSING_PROMPT.prompt}

Document Types and Required JSON Formats:
${JSON.stringify(DOCUMENT_PARSING_PROMPT.document_parsing_instructions, null, 2)}

Instructions:
${DOCUMENT_PARSING_PROMPT.instructions.map(inst => `- ${inst}`).join('\n')}

Please analyze the provided document image and extract the information according to the specifications above. Return only valid JSON.`;

      // Process with Hugging Face Vision-Language Model
      const result = await this.hf.chatCompletion({
        model: this.modelId,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: fullPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${file.type};base64,${base64Data}`
                }
              }
            ]
          }
        ],
        temperature: DOCUMENT_PARSING_PROMPT.temperature,
        max_tokens: 2000
      });

      const processingTime = Date.now() - startTime;

      // Parse the response
      const responseText = result.choices[0]?.message?.content || '';
      let extractedData: any = {};
      let documentType = '';
      let confidence = 0.8;

      try {
        // Try to parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
          documentType = extractedData['Document Type'] || 'Unknown';
          
          // Calculate confidence based on filled fields
          confidence = this.calculateConfidence(extractedData);
        }
      } catch (parseError) {
        console.warn('Failed to parse JSON response, using raw text');
        extractedData = { rawResponse: responseText };
      }

      // Basic stamp and signature detection
      const stampVerification = this.detectStampSignature(responseText, 'stamp');
      const signatureVerification = this.detectStampSignature(responseText, 'signature');

      const hfResult: HuggingFaceResult = {
        extractedText: responseText,
        documentType,
        extractedData,
        confidence,
        processingTime,
        stampVerification,
        signatureVerification
      };

      // Log successful processing
      securityService.logAction(
        userId,
        'huggingface_processing_complete',
        'document',
        file.name,
        {
          confidence: hfResult.confidence,
          documentType: hfResult.documentType,
          processingTime,
          stampDetected: stampVerification.isPresent,
          signatureDetected: signatureVerification.isPresent
        }
      );

      return hfResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Hugging Face processing failed';
      
      // Log processing error
      securityService.logAction(
        userId,
        'huggingface_processing_error',
        'document',
        file.name,
        { error: errorMessage }
      );

      throw new Error(`Hugging Face processing failed: ${errorMessage}`);
    }
  }

  private calculateConfidence(extractedData: any): number {
    if (!extractedData || typeof extractedData !== 'object') return 0.3;

    let totalFields = 0;
    let filledFields = 0;

    const countFields = (obj: any): void => {
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (Array.isArray(obj[key])) {
            totalFields++;
            if (obj[key].length > 0) filledFields++;
          } else {
            countFields(obj[key]);
          }
        } else {
          totalFields++;
          if (obj[key] && obj[key].toString().trim() !== '') {
            filledFields++;
          }
        }
      }
    };

    countFields(extractedData);
    
    if (totalFields === 0) return 0.3;
    const confidence = filledFields / totalFields;
    return Math.max(0.3, Math.min(0.95, confidence));
  }

  private detectStampSignature(text: string, type: 'stamp' | 'signature'): { isPresent: boolean; confidence: number } {
    const lowerText = text.toLowerCase();
    
    if (type === 'stamp') {
      const stampKeywords = ['stamp', 'seal', 'official', 'department', 'government'];
      const hasStampMention = stampKeywords.some(keyword => lowerText.includes(keyword));
      return {
        isPresent: hasStampMention,
        confidence: hasStampMention ? 0.7 : 0.1
      };
    } else {
      const signatureKeywords = ['signature', 'signed', 'name (if written)', 'date (if written)'];
      const hasSignatureMention = signatureKeywords.some(keyword => lowerText.includes(keyword));
      return {
        isPresent: hasSignatureMention,
        confidence: hasSignatureMention ? 0.7 : 0.1
      };
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async checkServiceHealth(): Promise<boolean> {
    try {
      // Simple health check by testing a small request
      const response = await fetch('https://api-inference.huggingface.co/models/' + this.modelId, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_HUGGINGFACE_API_KEY}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Hugging Face service health check failed:', error);
      return false;
    }
  }
}

export const huggingFaceService = new HuggingFaceService();
export type { HuggingFaceResult };