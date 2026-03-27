// generateMerkleTree.js
const fs = require("fs");
const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");

function main() {
  console.log("正在讀取 members.json...");
  
  // 1. 讀取你原本的名單檔案
  const jsonData = JSON.parse(fs.readFileSync("./members.json", "utf8"));
  const membersArray = jsonData.addresses;

  // 2. 將地址格式化為 Merkle Tree 需要的二維陣列格式: [ [address1], [address2], ... ]
  const values = membersArray.map(addr => [addr]);

  // 3. 建立 Merkle Tree (指定資料型態為 address)
  const tree = StandardMerkleTree.of(values, ["address"]);

  // 4. 印出最重要的 Merkle Root (這是要寫入智能合約的)
  console.log("========================================");
  console.log("✅ Merkle Tree 建立成功！");
  console.log("🌳 Merkle Root:", tree.root);
  console.log("========================================");

  // 5. (選擇性) 將整棵樹的資料匯出成 JSON 檔，實務上前端 DApp 會讀取這個檔案來拿 Proof
  fs.writeFileSync("tree.json", JSON.stringify(tree.dump(), null, 2));
  console.log("📂 完整的 Merkle Tree 結構已儲存至 tree.json");
}

main();