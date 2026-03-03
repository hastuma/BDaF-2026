// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract EthVault {
    address public immutable owner;
    event Deposit(address indexed sender, uint256 amount); // event 就是區塊鏈的log黨，因為沒辦法像Ｃ用印出來的檢查。 加上"indexed"是為了讓之後前端在找的時候比較快，否則就要traverse整個log檔案
    event Weethdraw(address indexed to, uint256 amount);
    event UnauthorizedWithdrawAttempt(address indexed caller, uint256 amount);
    constructor() { // constructor 類似c 的new 會自動執行一次，只是這邊的new 是deploy 的動作
        owner = msg.sender;
    }

    receive() external payable { 
        emit Deposit(msg.sender,msg.value); // emit 就代表寫入log 檔案
    }

    function withdraw(uint256 amount) external{
        // require(msg.sender == owner, "Only owner can withdraw");
        if(msg.sender == owner){
            require(amount <= address(this).balance, "Insufficient balance");
            emit Weethdraw(msg.sender,amount);
            // payable(owner).transfer(amount); 這個有 2300 Gas 的限制 所以現在會用下面這種的
            (bool success, ) = payable(owner).call{value: amount}("");
            require(success, "Transfer failed"); 
        }
        else {
            emit UnauthorizedWithdrawAttempt(msg.sender, amount);
        }
    }
}
