// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {BethEthToken} from "./BetEthToken.sol";
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract BetEthGame is Ownable {
    AggregatorV3Interface internal dataFeed;

    struct PlayerBet {
        address player;
        uint256 prediction;
        bool hasPlayed;
    }

    /// @dev List of bet slots
    PlayerBet[] playersBets;

    BethEthToken public bethEthToken;

    /// @notice Amount of tokens given per ETH paid
    uint256 public purchaseRatio;
    /// @notice Amount of tokens in the prize pool
    uint256 public prizePool;
    /// @notice Amount of tokens required for placing a bet that goes for the prize pool
    uint256 public betPrice;
    /// @notice Flag indicating whether the lottery is open for bets or not
    bool public betsOpen;
    /// @notice Mapping of prize available for withdraw for each account
    mapping(address => uint256) public prize;
    /// adress of the winner
    address public winner;

    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        uint256 _purchaseRatio,
        uint256 _betPrice,
        uint256 _initialSupply
    ) Ownable(msg.sender) {
        bethEthToken = new BethEthToken(tokenName, tokenSymbol, _initialSupply);
        purchaseRatio = _purchaseRatio;
        betPrice = _betPrice;

        dataFeed = AggregatorV3Interface(
            0x694AA1769357215DE4FAC081bf1f309aDC325306
        );
    }

    modifier isBetClosed() {
        require(!betsOpen, "Bets are open");
        _;
    }

    modifier isBetOpen() {
        require(betsOpen, "Bets are closed");
        _;
    }

    /// @notice Opens the Bets
    function openBets() external onlyOwner isBetClosed {
        betsOpen = true;
    }

    /// @notice Gives tokens based on the amount of ETH sent
    /// @dev This implementation is prone to rounding problems
    function purchaseTokens() external payable {
        // require(msg.value >= 1 ether, "minimum purchase is 1 ether");
        bethEthToken.mint(msg.sender, msg.value * purchaseRatio);
    }

    /// @notice Charges the bet price and creates a new bet slot with the sender's address
    function bet(uint256 _prediction) public isBetOpen {
        require(
            this.balanceOf(msg.sender) > 1,
            "Please purchase tokens first to play!"
        );
        prizePool += betPrice;
        playersBets.push(PlayerBet(msg.sender, _prediction, true));
        bethEthToken.transferFrom(msg.sender, address(this), betPrice);
    }

    /// @notice Closes the lottery and calculates the prize, if any
    /// @dev Anyone can call this function at any time after the closing time
    function closeBets() external onlyOwner isBetOpen {
        require(betsOpen, "Bets already closed");
        betsOpen = false;
    }

    /// @notice Withdraws `amount` from that accounts's prize pool
    function prizeWithdraw(uint256 amount) external {
        require(amount <= prizePool, "Not enough prize");
        require(msg.sender == winner, "You are not the winner!");
        bethEthToken.transfer(msg.sender, prizePool);
    }

    /**
     * Returns the latest answer.
     */
    function getEthUsdPrice() public view returns (uint256) {
        // prettier-ignore
        (
            /* uint80 roundID */,
            int answer,
            /*uint startedAt*/,
            /*uint timeStamp*/,
            /*uint80 answeredInRound*/
        ) = dataFeed.latestRoundData();

        uint256 price = uint256(answer) / 100000000;

        return price;
    }

    function setWinner() public onlyOwner isBetClosed {
        uint256 ethUsdPrice = getEthUsdPrice();
        uint256 diffPredPrice = 0;
        uint256 finalDiffPredPrice = 999999999999999999;
        uint256 finalWinnerIndex = 0;
        //Loook for nearest prediction player and transfer prizepool to him
        uint256 prediction;
        for (uint256 i = 0; i < playersBets.length; i++) {
            prediction = playersBets[i].prediction;
            if (prediction < ethUsdPrice) {
                diffPredPrice = ethUsdPrice - prediction;
            } else {
                diffPredPrice = prediction - ethUsdPrice;
            }
            if (finalDiffPredPrice > prediction) {
                finalDiffPredPrice = prediction;
                finalWinnerIndex = i;
            }
        }

        winner = playersBets[finalWinnerIndex].player;
        delete (playersBets);
    }

    /// @notice Burns `amount` tokens and give the equivalent ETH back to user
    function returnTokens(uint256 amount) external {
        bethEthToken.burnFrom(msg.sender, amount);
        payable(msg.sender).transfer(amount / purchaseRatio);
    }

    function balanceOf(address account) public view returns (uint256) {
        return bethEthToken.balanceOf(account);
    }

    function name() public view returns (string memory) {
        return bethEthToken.name();
    }

    function symbol() public view returns (string memory) {
        return bethEthToken.symbol();
    }

    function decimals() public view returns (uint8) {
        return bethEthToken.decimals();
    }

    function totalSupply() public view returns (uint256) {
        return bethEthToken.totalSupply();
    }
}
