export async function simulatePayment(amount: number): Promise<{ success: boolean }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // 90% success rate
      const success = Math.random() < 0.9;
      resolve({ success });
    }, 800);
  });
}
