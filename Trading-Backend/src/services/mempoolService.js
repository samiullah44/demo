import { AppError } from '../middleware/errorHandler.js';

export const broadcastTx = async (txHex) => {
  try {
    // Broadcast to mempool.space
    const response = await fetch('https://mempool.space/api/tx', {
      method: 'POST',
      body: txHex,
      headers: {
        'Content-Type': 'text/plain',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mempool API error: ${response.status} - ${errorText}`);
    }

    const txId = await response.text();
    return txId;
  } catch (error) {
    console.error('Transaction broadcast error:', error);
    throw new AppError(`Failed to broadcast transaction: ${error.message}`, 500);
  }
};

export const getTransactionStatus = async (txId) => {
  try {
    const response = await fetch(`https://mempool.space/api/tx/${txId}/status`);
    if (!response.ok) {
      throw new Error('Failed to fetch transaction status');
    }
    return await response.json();
  } catch (error) {
    throw new AppError(`Failed to get transaction status: ${error.message}`, 500);
  }
};