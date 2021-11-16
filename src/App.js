import React, { useEffect, useState, useRef } from "react";
import "./App.css";
import { useDispatch, useSelector } from "react-redux";
import { connect } from "./redux/blockchain/blockchainActions";
import { fetchData } from "./redux/data/dataActions";
import * as s from "./styles/globalStyles";
import styled, { ThemeConsumer } from "styled-components";
import { create } from "ipfs-http-client";
import SigantureCanvas from 'react-signature-canvas'
const { uniqueNamesGenerator, adjectives, colors, animals } = require('unique-names-generator');

const ipfsClient = create("https://ipfs.infura.io:5001/api/v0")

export const StyledButton = styled.button`
  padding: 8px;
`;

function App() {
  const dispatch = useDispatch();
  const blockchain = useSelector((state) => state.blockchain);
  const data = useSelector((state) => state.data);
  const elementRef = useRef();
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState("")
  const [NFTs, setNFTS] = useState([])

  const ipfsBaseUrl = "https://ipfs.infura.io/ipfs/" // WIP
  const name = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] }); 
  const description = uniqueNamesGenerator({ dictionaries: [adjectives, colors, animals] }); 


  const mint = (_uri) => {
    blockchain.smartContract.methods
    .mint(blockchain.account, _uri)
    .send({
      from: blockchain.account,
      // value: blockchain.web3.utils.toWei((0.05).toString(), 'ether')
    })
    .once("error", (error) => {
      console.log(error)
      setLoading(false)
      setStatus("Minting error")
    })
    .then((receipt) => {
      console.log(receipt)
      setLoading(false)
      clearCanvas();
      dispatch(fetchData(blockchain.account))
      setStatus("Successfully minted your NFT")
    }) 
  }

  const createMetaDataAndMint = async (_name, _description, _imgBuffer) => {
    setLoading(true);
    setStatus("Uploading to IPFS")
    try {
      const addedImage = await ipfsClient.add(_imgBuffer)
      const ipfsImageUrl = ipfsBaseUrl + addedImage.path

      const metadataObj = {
        name: _name,
        description: _description,
        image: ipfsImageUrl
      }

      const addedMetaData = await ipfsClient.add(JSON.stringify(metadataObj))
      const ipfsMetadataUrl = ipfsBaseUrl + addedMetaData.path

      console.log(ipfsMetadataUrl)
      mint(ipfsMetadataUrl)

    } catch (error) {
      setStatus("Error ", error)
    }    
  }

  // TODO: MINT MULTIUPLE NFTS ON 1 TRANSACTION
  const startMintingProcess = (_amount) => {
    createMetaDataAndMint(name, description, getImageData())
  }

  const getImageData = () => {
    const canvasEl = elementRef.current
    let dataUrl = canvasEl.toDataURL("image/png");
    const buffer = Buffer(dataUrl.split(",")[1], "base64");
    console.log(buffer)
    return buffer
  }

  const fetchMetaDataForNFTS = () => {
    setNFTS([]);
    data.allTokens.forEach((nft) => {
      fetch(nft.uri)
        .then((response) => response.json())
        .then((metaData) => {
          setNFTS((prevState) => [...prevState, {id: nft.id, metaData: metaData}])
        })
        .catch((err) => {
          console.log(err)
        })
    })
  }

  const clearCanvas = () => {
    const canvasEl = elementRef.current;
    canvasEl.clear()
  }

  useEffect(() => {
    fetchMetaDataForNFTS()
  }, [data.allTokens])

  useEffect(() => {
    if (blockchain.account !== "" && blockchain.smartContract !== null) {
      dispatch(fetchData(blockchain.account));
    }
  }, [blockchain.smartContract, dispatch]);



  return (
    <s.Screen>
      { blockchain.account === "" || blockchain.smartContract === null ? (
        <s.Container flex={1} ai={"center"} jc={"center"}>
          <s.TextTitle>Connect to the Blockchain</s.TextTitle>
          <s.SpacerSmall />
          <StyledButton
            onClick={(e) => {
              e.preventDefault();
              dispatch(connect());
            }}
          >
            CONNECT
          </StyledButton>
          <s.SpacerSmall />
          {blockchain.errorMsg !== "" ? (
            <s.TextDescription>{blockchain.errorMsg}</s.TextDescription>
          ) : null}
        </s.Container>
      ) : (
        <s.Container 
        flex={1} 
        ai={"center"} 
        jc="center"
         style={{ padding: 24, backgroundColor: "grey" }}
         >
          <s.TextTitle style={{ textAlign: "center" }}>
            CREATE YOUR NFTs
          </s.TextTitle>

          <s.SpacerSmall />

          { loading && (          
            <s.TextDescription style={{ textAlign: "center" }}>
              Loading...
            </s.TextDescription>
          )}

          { status !== "" && (          
            <s.TextDescription style={{ textAlign: "center" }}>
              { status }
            </s.TextDescription>
          )}

          <s.SpacerSmall />

          <StyledButton
            disabled={loading ? 1 : 0}
            onClick={(e) => {
              e.preventDefault();
              clearCanvas();
            }}
          >
          CLEAR
          </StyledButton>

          <s.SpacerSmall />

          <StyledButton
            disabled={loading ? 1 : 0}
            onClick={(e) => {
              e.preventDefault();
              startMintingProcess(1);
            }}
          >
           {loading ? "MINTING..." : "MINT"}
          </StyledButton>

          <s.SpacerSmall />


          <SigantureCanvas
            backgroundColor={"#3271bf"}
            canvasProps={{width: 350, height: 350}}
            ref={elementRef}
          />

          <s.SpacerSmall />

          { NFTs.map((nft, index) => (
            <s.Container key={index} style={{padding: 16}}>
               <s.TextTitle style={{ textAlign: "center" }}>{nft.metaData.name} </s.TextTitle>
               <s.TextDescription style={{ textAlign: "center" }}>{nft.metaData.description} </s.TextDescription>
               <img alt={nft.metaData.name} src={nft.metaData.image} width={150}/>
            </s.Container>
          ))}

          
        </s.Container>
      )}
    </s.Screen>
  );
}

export default App;
