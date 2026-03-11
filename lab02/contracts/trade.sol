// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TradeContract {
    address public immutable owner;
    address public tokenA;
    address public tokenB;
    
    
    constructor(address _tokenA, address _tokenB) {// deploy的時後可以傳入兩個地址，不用hard code 
        owner = msg.sender;
        tokenA = _tokenA; 
        tokenB = _tokenB; 
    }
    
    struct Trade {
        address seller;          
        address tokenForSale;    // 會傳入 tokenA 或 tokenB 的地址 ，這樣就可以回去看說是哪一個 token
        uint256 amountForSale;
        uint256 amountAsk;       // 他希望得到多少另一個幣種
        uint256 expiry;          
        bool isActive;           // 是否還有效（尚未成交且尚未被撤回）
    }
    
    event SetupTrade(address indexed seller, address indexed tokenForSale, uint256 amountForSale, uint256 amountAsk, uint256 expiry, uint256 tradeId);  
    event SettleTrade(uint256 indexed tradeId, address indexed buyer);
    event CancelTrade(uint256 indexed tradeId, address indexed seller);

    mapping(uint256 => Trade) public trades;
    uint256 public feeBalance_A; // 記錄合約已經賺了多少手續費，當有人成交的時候就會把手續費加到這裡面
    uint256 public feeBalance_B; 
    uint256 public tradeId; // 這個是用來記錄現在是第幾個交易了，當有人 setupTrade 的時候就會 +1
    
    function setupTrade(address inputTokenForSale, uint256 inputTokenAmount, uint256 outputTokenAsk, uint256 expiry) external {
        require(inputTokenForSale == tokenA || inputTokenForSale == tokenB, "Invalid token");
        
        require(IERC20(inputTokenForSale).balanceOf(msg.sender) >= inputTokenAmount, "Insufficient balance");
        require(expiry > block.timestamp, "Expiry must be in the future");// 確保時間在為來
        
        IERC20(inputTokenForSale).transferFrom(msg.sender, address(this), inputTokenAmount); // 先把賣的幣轉到合約裡面來，這樣才有辦法確保他真的有幣可以賣
       
        trades[tradeId] = Trade({ // 將新建立的交易添加到 tradeList 中
            seller: msg.sender,
            tokenForSale: inputTokenForSale,
            amountForSale: inputTokenAmount,
            amountAsk: outputTokenAsk,
            expiry: expiry,
            isActive: true
        });
        emit SetupTrade(msg.sender, inputTokenForSale, inputTokenAmount, outputTokenAsk, expiry,tradeId);
        tradeId++; 
    }
    
    function settleTrade(uint256 id) external {
        Trade storage t = trades[id]; // 使用 storage 像 C++ 的 reference，直接指向 mapping 裡的資料
        
        require(t.isActive, "Trade is not active");
        require(block.timestamp < t.expiry, "Trade has expired");
        //  Bob 要付的幣種 賣家賣的另一種
        address tokenToPay = (t.tokenForSale == tokenA) ? tokenB : tokenA;

        require(IERC20(tokenToPay).balanceOf(msg.sender) >= t.amountAsk, "Insufficient balance to settle");
        IERC20(tokenToPay).transferFrom(msg.sender, address(this), t.amountAsk); // Bob 先把錢轉給合約，確保他真的有錢可以付
        
        uint256 owner_fee = t.amountAsk / 1000;  // for all trades, the owner should get 0.1% fee the sale.
        uint256 seller_receive = t.amountAsk - owner_fee; // the seller will receive the rest of the money after deducting the fee.
        
        IERC20(tokenToPay).transfer(t.seller, seller_receive); // 合約付已經扣掉手續費的錢給 Alice
        IERC20(t.tokenForSale).transfer( msg.sender, t.amountForSale); // 合約把賣的幣轉給 Bob
        
        if(tokenToPay == tokenA){
            feeBalance_A += owner_fee;
        }
        else{
            feeBalance_B += owner_fee; 
        }
        t.isActive = false; 
        emit SettleTrade(id, msg.sender);
    }



    function cancelTrade(uint256 id) external { 
        Trade storage t = trades[id];
        require(t.isActive, "Trade is not active");
        require(msg.sender == t.seller, "Only seller can cancel");
        
        t.isActive = false;
        IERC20(t.tokenForSale).transfer(t.seller, t.amountForSale); // 把當初鎖在合約的幣還給賣家
        
        emit CancelTrade(id, msg.sender);
    }

    function withdrawFee() external {
        require(msg.sender == owner, "Only owner can withdraw");
        
        // 如果 A 幣有賺到手續費，就提領 A 幣並把帳本歸零
        if (feeBalance_A > 0) {
            uint256 amountA = feeBalance_A;
            feeBalance_A = 0;
            IERC20(tokenA).transfer(owner, amountA);
        }
        
        // 如果 B 幣有賺到手續費，就提領 B 幣並把帳本歸零
        if (feeBalance_B > 0) {
            uint256 amountB = feeBalance_B;
            feeBalance_B = 0;
            IERC20(tokenB).transfer(owner, amountB);
        }
    }
}