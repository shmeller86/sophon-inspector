## Functions and Parameters

### Function: `batchMint(address[] receivers, uint256[] quantities, address validatorDelegate)`
| #   | Name              | Type        | Data                                               |
| --- | ----------------- | ----------- | -------------------------------------------------- |
| 0   | `receivers`       | `address[]` | `0xD538C7D64F4AbAd7608B7242Fa574Dc38C1e6c8d`       |
| 1   | `quantities`      | `uint256[]` | `3`                                                |
| 2   | `validatorDelegate` | `address`   | `0x0000000000000000000000000000000000008001`       |

**MethodID:** `0x8063f367`
0x5e0927d844acaf1b5b3d6fc60c141645a4021a24d501dba971836d488277e084

---

### Function: `delegateToLightNodes(address[] receivers, uint256[] maxAmounts, bool partialFill)`
| #   | Name              | Type        | Data                                               |
| --- | ----------------- | ----------- | -------------------------------------------------- |
| 0   | `receivers`       | `address[]` | `0xD538C7D64F4AbAd7608B7242Fa574Dc38C1e6c8d`       |
| 1   | `maxAmounts`      | `uint256[]` | `3`                                                |
| 2   | `partialFill`     | `bool`      | `false`                                            |

**MethodID:** `0xf485cc4b`

**Topics:**
```json
[
    "0xd9a687098552b070e1e304af176b8a589970267356590b7c7386c2f4fb7d0cc8",
    "0x000000000000000000000000d538c7d64f4abad7608b7242fa574dc38c1e6c8d",
    "0x000000000000000000000000d538c7d64f4abad7608b7242fa574dc38c1e6c8d"
]

{
    "jsonrpc": "2.0",
    "method": "eth_getLogs",
    "params": [
        {
            "address": "0xd8E3A935706c08B5e6f8e05D63D3E67ce2ae330C",
            "fromBlock": "earliest",
            "toBlock": "latest",
            "topics": ["0xd9a687098552b070e1e304af176b8a589970267356590b7c7386c2f4fb7d0cc8", "0x000000000000000000000000d538c7d64f4abad7608b7242fa574dc38c1e6c8d"] // если известно, добавьте фильтр по событиям
        }
    ],
    "id": 1
}
```

---

### Function: `removeDelegationToLightNode(address receiver)`
| #   | Name              | Type        | Data                                               |
| --- | ----------------- | ----------- | -------------------------------------------------- |
| 0   | `receivers`       | `address[]` | `0xD538C7D64F4AbAd7608B7242Fa574Dc38C1e6c8d`       |


**MethodID:** `0xf0bd7e5b`
```json
[
                "0x94784069b8ffa11f7392979bd35691ef746b2c02f3709f7112aae7e2b2f41f23",
                "0x000000000000000000000000d538c7d64f4abad7608b7242fa574dc38c1e6c8d",
                "0x000000000000000000000000d538c7d64f4abad7608b7242fa574dc38c1e6c8d"
]

{
    "jsonrpc": "2.0",
    "method": "eth_getLogs",
    "params": [
        {
            "address": "0xd8E3A935706c08B5e6f8e05D63D3E67ce2ae330C",
            "fromBlock": "0x3249d",
            "toBlock": "0x3249d",
            "topics": []
        }
    ],
    "id": 1
}
```
