import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract TokenA is ERC20 {
    address public immutable owner;
    // constructor() { // constructor 類似c 的new 會自動執行一次，只是這邊的new 是deploy 的動作
    //     owner = msg.sender;
    // }

    // 這裡我們直接在繼承列表中呼叫父類別的建構子
    constructor() ERC20("TokenA", "TKA") {
        // 設定總供應量：1億顆 * 10的18次方
        // msg.sender 是部署合約的人，他會拿到這所有的錢
        owner = msg.sender;
        _mint(msg.sender, 100_000_000 * 10**18);
    }
}


    // event Deposit(address indexed sender, uint256 amount); // event 就是區塊鏈的log黨，因為沒辦法像Ｃ用印出來的檢查。 加上"indexed"是為了讓之後前端在找的時候比較快，否則就要traverse整個log檔案
    // event Weethdraw(address indexed to, uint256 amount);
    // event UnauthorizedWithdrawAttempt(address indexed caller, uint256 amount);
    // function withdraw(uint256 amount) external{
    //     // require(msg.sender == owner, "Only owner can withdraw");
    //     if(msg.sender == owner){
    //         require(amount <= address(this).balance, "Insufficient balance");
    //         emit Weethdraw(msg.sender,amount);
    //         // payable(owner).transfer(amount); 這個有 2300 Gas 的限制 所以現在會用下面這種的
    //         (bool success, ) = payable(owner).call{value: amount}("");
    //         require(success, "Transfer failed"); 
    //     }
    //     else {
    //         emit UnauthorizedWithdrawAttempt(msg.sender, amount);
    //     }
    // }
