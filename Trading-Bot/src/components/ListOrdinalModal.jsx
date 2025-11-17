import React, { useState, useEffect } from 'react';
import { X, Bitcoin, Shield, CheckCircle, AlertCircle, Search, Loader } from 'lucide-react';
import useWalletStore from '../store/useWalletStore';
import usePSBTStore from '../store/usePSBTStore';
import useOrdinalStore from '../store/useOrdinalStore';
import { toast } from 'react-hot-toast';

const ListOrdinalModal = ({ ordinal, isOpen, onClose, onListed }) => {
  const [step, setStep] = useState(1);
  const [price, setPrice] = useState('');
  const [paymentAddress, setPaymentAddress] = useState('');
  const [ownershipVerified, setOwnershipVerified] = useState(false);
  const [searchInscriptionId, setSearchInscriptionId] = useState('');
  const [selectedOrdinal, setSelectedOrdinal] = useState(null);
  const [loadingOrdinal, setLoadingOrdinal] = useState(false);
  
  const { address, walletType } = useWalletStore();
  const { 
    generateSellerPSBT, 
    signSellerPSBT, 
    createListing, 
    verifyOwnership,
    listingInProgress,
    error,
    clearPSBTState,
    clearError
  } = usePSBTStore();

  const { getUserOrdinals, userOrdinals } = useOrdinalStore();

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setPrice('');
      setPaymentAddress(address || '');
      setOwnershipVerified(false);
      setSelectedOrdinal(ordinal || null);
      setSearchInscriptionId('');
      clearPSBTState();
      clearError();

      // Fetch user's ordinals if no specific ordinal is provided
      if (!ordinal && address) {
        getUserOrdinals(address);
      }
    }
  }, [isOpen, address, ordinal]);

  // Handle inscription ID search
  const handleSearchInscription = async () => {
    if (!searchInscriptionId.trim()) return;

    setLoadingOrdinal(true);
    clearError();

    try {
      // This would typically call your backend to fetch ordinal data
      // For now, we'll create a mock ordinal object
      const mockOrdinal = {
        inscription_id: searchInscriptionId,
        name: `Ordinal ${searchInscriptionId.slice(-8)}`,
        inscription_number: 'Unknown',
        output: `${searchInscriptionId}:0`, // Mock output
        image_url: `https://ordinals.com/content/${searchInscriptionId}`,
        owner: address
      };

      setSelectedOrdinal(mockOrdinal);
      setOwnershipVerified(false); // Reset ownership verification
    } catch (err) {
      console.error('Failed to fetch ordinal:', err);
      clearError();
      // In a real app, you'd set an error state here
    } finally {
      setLoadingOrdinal(false);
    }
  };

  // Handle selecting an ordinal from user's collection
  const handleSelectOrdinal = (userOrdinal) => {
    setSelectedOrdinal(userOrdinal);
    setOwnershipVerified(false); // Reset ownership verification
    clearError();
  };

  const handleVerifyOwnership = async () => {
    try {
      clearError();
      
      if (!selectedOrdinal) {
        throw new Error('Please select an ordinal first');
      }

      const isOwner = await verifyOwnership(selectedOrdinal.inscription_id, address);
      setOwnershipVerified(isOwner);
      
      if (!isOwner) {
        toast.error('You are not the owner of this inscription');
        throw new Error('You are not the owner of this inscription');

      }
    } catch (err) {
      console.error('Ownership verification failed:', err);
    }
  };

  const handleGeneratePSBT = async () => {
    try {
      clearError();
      
      if (!selectedOrdinal) {
        throw new Error('Please select an ordinal first');
      }

      if (!ownershipVerified) {
        throw new Error('Please verify ownership first');
      }
      
      if (!price || parseFloat(price) <= 0) {
        throw new Error('Please enter a valid price');
      }

      const priceSats = Math.floor(parseFloat(price) * 100000000);
      await generateSellerPSBT(selectedOrdinal, priceSats, paymentAddress || address);
      setStep(2);
    } catch (err) {
      console.error('PSBT generation failed:', err);
    }
  };

  const handleSignPSBT = async () => {
    try {
      clearError();
      
      if (!selectedOrdinal) {
        throw new Error('No ordinal selected');
      }

      const signedPSBT = await signSellerPSBT(usePSBTStore.getState().sellerPSBT, walletType);
      
      // Create listing with signed PSBT
      await createListing({
        inscription_id: selectedOrdinal.inscription_id,
        inscription_number: selectedOrdinal.inscription_number,
        inscription_output: selectedOrdinal.output,
        price_sats: Math.floor(parseFloat(price) * 100000000),
        price_btc: parseFloat(price),
        seller_address: address,
        payment_address: paymentAddress || address,
        signed_psbt: signedPSBT
      });
      
      setStep(3);
      onListed?.();
    } catch (err) {
      console.error('PSBT signing failed:', err);
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
              {selectedOrdinal ? 'List Ordinal for Sale' : 'Select Ordinal to List'}
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

          {/* Step 1: Select Ordinal & Verify Ownership */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Ordinal Selection Section - Only show if no ordinal was pre-selected */}
              {!ordinal && (
                <div className="space-y-4">
                  {/* Search by Inscription ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search by Inscription ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchInscriptionId}
                        onChange={(e) => setSearchInscriptionId(e.target.value)}
                        placeholder="Enter inscription ID..."
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleSearchInscription}
                        disabled={loadingOrdinal || !searchInscriptionId.trim()}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {loadingOrdinal ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* User's Ordinals List */}
                  {userOrdinals && userOrdinals.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Ordinals
                      </label>
                      <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg">
                        {userOrdinals.map((userOrdinal) => (
                          <div
                            key={userOrdinal.inscription_id}
                            onClick={() => handleSelectOrdinal(userOrdinal)}
                            className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                              selectedOrdinal?.inscription_id === userOrdinal.inscription_id ? 'bg-blue-50 border-blue-200' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={userOrdinal.image_url || `https://ordinals.com/content/${userOrdinal.inscription_id}`}
                                alt={userOrdinal.name}
                                className="w-10 h-10 object-cover rounded"
                                onError={(e) => {
                                  e.target.src = `https://via.placeholder.com/40x40/1f2937/ffffff?text=Ordinal`;
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {userOrdinal.name || `Ordinal #${userOrdinal.inscription_number || userOrdinal.inscription_id.slice(-8)}`}
                                </p>
                                <p className="text-xs text-gray-500 font-mono truncate">
                                  {userOrdinal.inscription_id}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Ordinal Display */}
              {selectedOrdinal && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={selectedOrdinal.image_url || `https://ordinals.com/content/${selectedOrdinal.inscription_id}`}
                      alt={selectedOrdinal.name}
                      className="w-16 h-16 object-cover rounded"
                      onError={(e) => {
                        e.target.src = `https://via.placeholder.com/64x64/1f2937/ffffff?text=Ordinal`;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {selectedOrdinal.name || `Ordinal #${selectedOrdinal.inscription_number || selectedOrdinal.inscription_id.slice(-8)}`}
                      </h4>
                      <p className="text-sm text-gray-600 font-mono truncate">
                        {selectedOrdinal.inscription_id}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Verify Ownership
                      </label>
                      <button
                        onClick={handleVerifyOwnership}
                        disabled={!address}
                        className={`w-full py-3 px-4 rounded-lg font-medium ${
                          ownershipVerified
                            ? 'bg-green-500 text-white'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        } disabled:bg-gray-300 disabled:cursor-not-allowed`}
                      >
                        {ownershipVerified ? (
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            Ownership Verified
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Shield className="w-5 h-5" />
                            Verify Ownership
                          </div>
                        )}
                      </button>
                    </div>

                    {ownershipVerified && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Price (BTC)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.00000001"
                              min="0.00000001"
                              value={price}
                              onChange={(e) => setPrice(e.target.value)}
                              placeholder="0.001"
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <Bitcoin className="w-5 h-5 text-orange-500 absolute left-3 top-3.5" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Payment Address (Optional)
                          </label>
                          <input
                            type="text"
                            value={paymentAddress}
                            onChange={(e) => setPaymentAddress(e.target.value)}
                            placeholder={address}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Leave empty to use your connected wallet address
                          </p>
                        </div>

                        <button
                          onClick={handleGeneratePSBT}
                          disabled={listingInProgress || !price}
                          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {listingInProgress ? 'Generating PSBT...' : 'Generate PSBT & Continue'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* No Ordinal Selected Message */}
              {!selectedOrdinal && !ordinal && (
                <div className="text-center py-8 text-gray-500">
                  <p>Select an ordinal from your collection or search by inscription ID to list it for sale.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Sign PSBT */}
          {step === 2 && selectedOrdinal && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-blue-500" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Sign PSBT with Your Wallet
                </h4>
                <p className="text-gray-600">
                  Please check your wallet to sign the PSBT transaction. This will list your ordinal for {price} BTC.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Signing this PSBT gives permission to transfer this ordinal when someone purchases it. You remain the owner until the ordinal is sold.
                </p>
              </div>

              <button
                onClick={handleSignPSBT}
                disabled={listingInProgress}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {listingInProgress ? 'Signing & Creating Listing...' : 'Sign PSBT & List for Sale'}
              </button>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && selectedOrdinal && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">
                Listing Created Successfully!
              </h4>
              <p className="text-gray-600">
                Your ordinal is now listed for {price} BTC on the marketplace.
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedOrdinal.image_url || `https://ordinals.com/content/${selectedOrdinal.inscription_id}`}
                    alt={selectedOrdinal.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">
                      {selectedOrdinal.name || `Ordinal #${selectedOrdinal.inscription_number}`}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Bitcoin className="w-4 h-4 text-orange-500" />
                      {price} BTC
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListOrdinalModal;