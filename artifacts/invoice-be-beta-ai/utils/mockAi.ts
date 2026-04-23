export async function generateDescription(itemName: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lower = itemName.toLowerCase();
      if (lower.includes('design')) {
        resolve(`Comprehensive design services including wireframes, mockups, and final high-fidelity designs for ${itemName}.`);
      } else if (lower.includes('dev') || lower.includes('code') || lower.includes('app')) {
        resolve(`Full-stack development and engineering for ${itemName}, ensuring high performance and scalability.`);
      } else if (lower.includes('photo') || lower.includes('shoot')) {
        resolve(`Professional photography session for ${itemName}, including post-processing and digital delivery.`);
      } else if (lower.includes('clean')) {
        resolve(`Deep cleaning service for ${itemName}, using eco-friendly products and thorough sanitation methods.`);
      } else if (lower.includes('consult')) {
        resolve(`Strategic consulting session regarding ${itemName}, providing actionable insights and a detailed report.`);
      } else {
        resolve(`Professional services rendered for ${itemName}.`);
      }
    }, 500);
  });
}
