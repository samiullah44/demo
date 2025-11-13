// const ordinalsExplorerUrl = "https://ordinals.com";

// export async function getInscriptionDataById(inscriptionId, verifyIsInscriptionNumber) {
//     try {
//         const response = await fetch(ordinalsExplorerUrl + "/inscription/" + inscriptionId);
//         const html = await response.text();

//         const data = [...html.matchAll(/<dt>(.*?)<\/dt>\s*<dd.*?>(.*?)<\/dd>/gm)]
//             .map(x => { 
//                 x[2] = x[2].replace(/<.*?>/gm, ''); 
//                 return x 
//             })
//             .reduce((a, b) => { 
//                 return { ...a, [b[1]]: b[2] } 
//             }, {});

//         const error = `Inscription ${verifyIsInscriptionNumber || inscriptionId} not found (maybe you're on signet and looking for a mainnet inscription or vice versa)`;
        
//         try {
//             data.number = html.match(/<h1>Inscription (\d*)<\/h1>/)[1];
//         } catch { 
//             throw new Error(error);
//         }
        
//         if (verifyIsInscriptionNumber && String(data.number) != String(verifyIsInscriptionNumber)) {
//             throw new Error(error);
//         }

//         // Extract additional metadata
//         try {
//             data.contentType = html.match(/<dd>(\w+\/[-+.\w]+)</)?.[1] || 'unknown';
//             data.timestamp = html.match(/<dd>([\d:-]+\s+UTC)</)?.[1] || 'unknown';
//             data.address = html.match(/<dd class=address>(\w+)</)?.[1] || 'unknown';
//         } catch (e) {
//             console.log('Error parsing additional metadata:', e);
//         }

//         return data;
//     } catch (error) {
//         console.error('Error fetching inscription:', error);
//         throw error;
//     }
// }