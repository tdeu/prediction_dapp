"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";


const Home = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <h1 className="text-center mb-8">
        <span className="block text-4xl font-bold">ETH Price Prediction Game</span>
      </h1>

      <div className="flex flex-col items-center mb-8">
        <p>Connected Address: <Address address={connectedAddress} /></p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <BetsStatus />
        <OpenBets />
        <BuyTokens />
        <TokenBalance />
        <PlaceBet />
        <CloseBetsButton/>
        <DisplayWinnerAndPrice/>
      </div>
    </div>
  );
};

export default Home;

// Component definitions below:

const BetsStatus = () => {
  const [betsOpen, setBetsOpen] = useState("");

  const fetchBetsStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/are-bets-open');
      const data = await response.json();
      setBetsOpen(data.result);
    } catch (error) {
      console.error("Error fetching bets status:", error);
      setBetsOpen("Error fetching status");
    }
  };

  useEffect(() => {
    fetchBetsStatus();
    const interval = setInterval(fetchBetsStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return <p className="mt-4">{betsOpen}</p>;
};

const OpenBets = () => {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenBets = async () => {
    setIsLoading(true);
    setMessage("");
    try {
      const response = await fetch('http://localhost:3001/open-bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      console.log("Open bets response:", data);

      if (response.ok && data.result === 1) {
        setMessage("Bets opened successfully!");
      } else {
        setMessage(`Error opening bets: ${data.result || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error opening bets:", error);
      setMessage(`Error opening bets: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <button 
        onClick={handleOpenBets} 
        className="btn btn-primary"
        disabled={isLoading}
      >
        {isLoading ? 'Opening Bets...' : 'Open Bets'}
      </button>
      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  );
};
const BuyTokens = () => {
  const [buyAmount, setBuyAmount] = useState("");

  const handleBuyTokens = async () => {
    if (!buyAmount || isNaN(Number(buyAmount)) || Number(buyAmount) <= 0) {
      alert("Please enter a valid positive amount");
      return;
    }
  
    try {
      console.log("Sending request to buy tokens with amount:", buyAmount);
      const response = await fetch('http://localhost:3001/buy-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: buyAmount.toString() })
      });
  
      console.log("Raw response:", response);
  
      const text = await response.text();
      console.log("Response text:", text);
  
      let data;
      try {
        data = JSON.parse(text);
        console.log("Parsed response data:", data);
      } catch (e) {
        console.error("Error parsing JSON:", e);
        alert("Received non-JSON response from server");
        return;
      }
  
      if (response.ok) {
        if (data.result === 'success') {
          console.log("Transaction successful");
          alert(`Successfully bought tokens for ${buyAmount} ETH. Please check your token balance.`);
        } else {
          console.warn("Unexpected success response:", data);
          alert(`Transaction completed, but with unexpected response. Please check your token balance.`);
        }
      } else {
        console.error("Server error:", data);
        alert(`Server error: ${data.message || response.statusText}`);
      }
  
      setBuyAmount("");
    } catch (error) {
      console.error("Error in handleBuyTokens:", error);
      alert(`Error buying tokens: ${error.message}`);
    }
  };

  return (
    <div className="mt-4">
      <p className="text-sm text-white-600 mb-2">
        Enter the amount of ETH you want to spend to buy tokens. 1 ETH = 100 tokens.
      </p>
      <div className="flex items-center">
        <input 
          type="text" 
          value={buyAmount} 
          onChange={(e) => setBuyAmount(e.target.value)}
          placeholder="Amount of ETH to spend"
          className="input input-bordered mr-2"
        />
        <button onClick={handleBuyTokens} className="btn btn-accent">Buy Tokens</button>
      </div>
    </div>
  );
};

const TokenBalance = () => {
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const { address } = useAccount();

  const fetchBalance = async () => {
    if (!address) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/token-balance/${address}`);
      const data = await response.json();
      setBalance(data.result);
    } catch (error) {
      console.error('Error fetching token balance:', error);
      setBalance('Error fetching balance');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBalance();
  }, [address]);

  return (
    <div className="mt-4">
      <h3 className="text-xl font-semibold mb-2">Your Token Balance</h3>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <p className="text-lg">{balance || 'Connect wallet to view balance'}</p>
      )}
      <button 
        onClick={fetchBalance}
        disabled={loading || !address}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        Refresh Balance
      </button>
    </div>
  );
};

const PlaceBet = () => {
  const [betPrediction, setBetPrediction] = useState("");
  const [message, setMessage] = useState("");

  const handlePlaceBet = async () => {
    if (!betPrediction) {
      setMessage("Please enter a prediction.");
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prediction: betPrediction })
      });

      const data = await response.json();
      console.log("Bet response:", data);

      if (response.ok && data.result === 'success') {
        setMessage(`Bet placed successfully on a price of ${betPrediction} USD per ETH`);
        setBetPrediction("");
      } else {
        setMessage(`Error placing bet: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error placing bet:", error);
      setMessage(`Error placing bet: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col items-center mt-4">
      <p className="text-sm text-white-600 mb-2">
        Enter your prediction for the ETH price.
      </p>
      <div className="flex items-center">
        <input 
          type="text" 
          value={betPrediction} 
          onChange={(e) => setBetPrediction(e.target.value)}
          placeholder="Your prediction"
          className="input input-bordered mr-2"
        />
        <button onClick={handlePlaceBet} className="btn btn-info">Place Prediction</button>
      </div>
      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  );
};

const CloseBetsButton = () => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCloseBets = async () => {
    setIsLoading(true);
    setMessage('');
    try {
      const response = await fetch('http://localhost:3001/close-bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      console.log("Close bets response:", data);

      if (response.ok) {
        if (data.result === 'success') {
          setMessage("Bets closed successfully!");
        } else {
          setMessage(`Unexpected result: ${data.result}`);
        }
      } else {
        setMessage(`Error closing bets: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error closing bets:", error);
      setMessage(`Error closing bets: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <button 
        onClick={handleCloseBets} 
        className="btn btn-primary"
        disabled={isLoading}
      >
        {isLoading ? 'Closing Bets...' : 'Close Bets'}
      </button>
      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  );
};

const DisplayWinnerAndPrice = () => {
  const [winner, setWinner] = useState('');
  const [ethPrice, setEthPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchWinner = async () => {
    setIsLoading(true);
    setError('');
    setWinner('');
    try {
      const response = await fetch('http://localhost:3001/get-winner');
      const data = await response.json();

      if (response.ok) {
        setWinner(data.result);
      } else {
        setError(`Error fetching winner: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error fetching winner:", error);
      setError(`Error fetching winner: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEthPrice = async () => {
    setIsLoading(true);
    setError('');
    setEthPrice('');
    try {
      const response = await fetch('http://localhost:3001/get-eth-usd-price');
      const data = await response.json();

      if (response.ok) {
        setEthPrice(data.result);
      } else {
        setError(`Error fetching ETH price: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error fetching ETH price:", error);
      setError(`Error fetching ETH price: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = async () => {
    await fetchWinner();
    await fetchEthPrice();
  };

  return (
    <div className="mt-4">
      <h2>Winner and ETH Price</h2>
      <button 
        onClick={fetchData} 
        className="btn btn-primary"
        disabled={isLoading}
      >
        {isLoading ? 'Fetching...' : 'Get Winner and ETH Price'}
      </button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
      {winner && <p className="mt-2">The winning address is: {winner}</p>}
      {ethPrice && <p className="mt-2">The price of 1 ETH is indeed: {ethPrice} USD</p>}
    </div>
  );
};


