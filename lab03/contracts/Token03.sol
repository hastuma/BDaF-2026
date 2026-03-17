// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";    


contract Token03 is ERC20 {
    using ECDSA for bytes32; // 讓 bytes32 可以直接呼叫 .recover()

    address public immutable contractOwner; // 改名避免與 permit 參數衝突

    mapping(address => uint256) public nonces;
    
    constructor() ERC20("Token03", "TK03") {// 這裡直接在繼承列表中呼叫父類別的建構子
        contractOwner = msg.sender;// msg.sender 是部署合約的人，他會拿到這所有的錢
        _mint(msg.sender, 100_000_000 * 10**18);
    }
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 nonce,
        uint256 deadline,   
        bytes memory signature
    ) public {
        require(nonce == nonces[owner], "Permit: invalid nonce");
        require(block.timestamp <= deadline, "Permit: signature expired");

        
        bytes32 hash = keccak256(
            abi.encodePacked(
                owner, 
                spender, 
                value, 
                nonce, 
                deadline,address(this) 
                // 加這個是因為如果有另一個contract 也有一個 permit而且alice 也有錢，
                // 這樣bob 就沒辦法拿這個signature 去那邊用了
                ));
        // bytes32 message = ECDSA.toEthSignedMessageHash(hash);    //會幫忙加上ETH簽名的前綴 "\x19Ethereum Signed Message:\n32" 然後對 hash 做一次 keccak256    
        bytes32 message = MessageHashUtils.toEthSignedMessageHash(hash);
        address signer = ECDSA.recover(message, signature);// 可以拿輸入的資料跟千張去還原說寄件者是誰
        require(signer == owner, "Permit: invalid signature");
        nonces[owner]++;
        _approve(owner, spender, value);
    }

}