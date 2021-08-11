pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract ZombieNftFactory is ERC721URIStorage {

    event NewZombie(uint zombieId, string name, uint dna);

    uint dnaDigits = 16;
    uint dnaModulus = 10 ** dnaDigits;

    struct Zombie {
        string name;
        uint dna;
        uint32 level;
    }

    Zombie[] public zombies;
    mapping (address => uint) ownerZombieCount;

    
    constructor() ERC721("CrazyZombie", "ZN") {}
    
    function _createZombie(string memory _name, uint _dna) private {
        zombies.push(Zombie(_name, _dna, 1)) ;
        uint id = zombies.length - 1;
        _mintItem(msg.sender, _name);
        emit NewZombie(id, _name, _dna);
    }

    function _generateRandomDna(string memory _str) private view returns (uint) {
        uint rand = uint(keccak256(abi.encodePacked(_str)));
        return rand % dnaModulus;
    }

    function createRandomZombie(string memory _name) public {
        uint randDna = _generateRandomDna(_name);
        _createZombie(_name, randDna);
    }


    function _mintItem(address owner, string memory tokenURI) private returns (uint256) {
        uint256 zombieId = zombies.length - 1; 
        _mint(owner, zombieId);
        _setTokenURI(zombieId, tokenURI);

        return zombieId;
    }

    function getZombieName(uint256 id) public view returns (string memory) {
        return zombies[id].name;
    }
    
    function getZombie(uint256 id) public view returns (Zombie memory) {
        return zombies[id];
    }
    
    function getZombieLength() public view returns (uint256) {
        return zombies.length;
    }
}