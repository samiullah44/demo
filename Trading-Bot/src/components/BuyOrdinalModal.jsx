import React, { useState, useEffect } from 'react';
import { X, Bitcoin, Shield, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import useWalletStore from '../store/useWalletStore';
import usePSBTStore from '../store/usePSBTStore';

const BuyOrdinalModal = ({ listing, isOpen, onClose, onPurchased }) => {
  const [step, setStep] = useState(1);
  const [receiverAddress, setReceiverAddress] = useState('');
  
  const { address, walletType, balance } = useWalletStore();
  const { 
    generateBuyerPSBT, 
    signBuyerPSBT, 
    completePurchase,
    purchaseInProgress,
    error,
    clearPSBTState,
    clearError
  } = usePSBTStore();

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setReceiverAddress(address || '');
      clearPSBTState();
      clearError();
    }
  }, [isOpen, address]);

  const hasSufficientBalance = balance >= (listing?.price_btc || 0);

  const handleGenerateBuyerPSBT = async () => {
    try {
      clearError();
      
      if (!hasSufficientBalance) {
        throw new Error('Insufficient balance to complete purchase');
      }

      await generateBuyerPSBT(listing._id, address, receiverAddress || address);
      setStep(2);
    } catch (err) {
      console.error('Buyer PSBT generation failed:', err);
    }
  };

  const handleSignAndPurchase = async () => {
    try {
      clearError();
      const signedPSBT = await signBuyerPSBT(usePSBTStore.getState().buyerPSBT, walletType);
      
      const result = await completePurchase(listing._id, signedPSBT);
      setStep(3);
      onPurchased?.(result.data);
    } catch (err) {
      console.error('Purchase failed:', err);
    }
  };

  const handleClose = () => {
    clearPSBTState();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              Buy Ordinal
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Step 1: Confirm Purchase */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={listing.ordinal?.image_url || `https://ordinals.com/content/${listing.inscription_id}`}
                    alt={listing.ordinal?.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {listing.ordinal?.name || `Ordinal #${listing.inscription_number}`}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Listed by {listing.seller_address?.slice(0, 8)}...{listing.seller_address?.slice(-8)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <span className="text-gray-700">Price:</span>
                  <div className="flex items-center gap-2">
                    <Bitcoin className="w-5 h-5 text-orange-500" />
                    <span className="font-bold text-gray-900">{listing.price_btc} BTC</span>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Your Balance:</span>
                  <div className="flex items-center gap-2">
                    <Bitcoin className="w-5 h-5 text-gray-500" />
                    <span className={`font-bold ${hasSufficientBalance ? 'text-green-600' : 'text-red-600'}`}>
                      {balance} BTC
                    </span>
                  </div>
                </div>

                {!hasSufficientBalance && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">
                      Insufficient balance. You need {listing.price_btc - balance} more BTC to complete this purchase.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receiver Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={receiverAddress}
                    onChange={(e) => setReceiverAddress(e.target.value)}
                    placeholder={address}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to send to your connected wallet address
                  </p>
                </div>

                <button
                  onClick={handleGenerateBuyerPSBT}
                  disabled={purchaseInProgress || !hasSufficientBalance}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {purchaseInProgress ? 'Preparing Purchase...' : 'Continue to Payment'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Sign & Complete Purchase */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-blue-500" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Confirm Purchase
                </h4>
                <p className="text-gray-600">
                  Please check your wallet to sign the purchase transaction for {listing.price_btc} BTC.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Final Step:</strong> Signing this PSBT will complete your purchase and transfer {listing.price_btc} BTC to the seller.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Item:</span>
                  <span className="font-medium text-gray-900">
                    {listing.ordinal?.name || `Ordinal #${listing.inscription_number}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-medium text-gray-900 flex items-center gap-1">
                    <Bitcoin className="w-4 h-4" />
                    {listing.price_btc} BTC
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Seller:</span>
                  <span className="font-medium text-gray-900 text-sm">
                    {listing.seller_address?.slice(0, 6)}...{listing.seller_address?.slice(-4)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSignAndPurchase}
                disabled={purchaseInProgress}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {purchaseInProgress ? 'Processing Purchase...' : 'Sign & Complete Purchase'}
              </button>
            </div>
          )}

          {/* Step 3: Purchase Complete */}
          {step === 3 && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">
                Purchase Successful!
              </h4>
              <p className="text-gray-600">
                The ordinal has been transferred to your wallet.
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <img
                    src={listing.ordinal?.image_url || `https://ordinals.com/content/${listing.inscription_id}`}
                    alt={listing.ordinal?.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">
                      {listing.ordinal?.name || `Ordinal #${listing.inscription_number}`}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Bitcoin className="w-4 h-4 text-orange-500" />
                      {listing.price_btc} BTC
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
                >
                  Close
                </button>
                <button
                  onClick={() => window.open(`https://mempool.space/tx/${usePSBTStore.getState().signedBuyerPSBT}`, '_blank')}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Transaction
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyOrdinalModal;