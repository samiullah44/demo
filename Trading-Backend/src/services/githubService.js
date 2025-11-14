// services/githubService.js
const collectionsRepo = "ordinals-wallet/ordinals-collections";

// Multiple possible URL patterns for fallback
const GITHUB_URL_PATTERNS = [
  `https://raw.githubusercontent.com/${collectionsRepo}/main/collections/{slug}/inscriptions.json`,
  `https://raw.githubusercontent.com/${collectionsRepo}/master/collections/{slug}/inscriptions.json`,
  `https://api.github.com/repos/${collectionsRepo}/contents/collections/{slug}/inscriptions.json`,
  // Add more patterns if needed
];

export async function fetchCollectionFromGitHub(collectionSlug) {
  try {
    // Special case for under-1k
    if (collectionSlug === 'under-1k') {
      const response = await fetch('/static/under-1k.json');
      if (!response.ok) throw new Error('Failed to fetch under-1k collection');
      return await response.json();
    }

    let lastError = null;

    // Try each URL pattern until one works
    for (const pattern of GITHUB_URL_PATTERNS) {
      try {
        const url = pattern.replace('{slug}', collectionSlug);
        console.log(`Trying GitHub URL: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Ordinals-Collection-App'
          },
          timeout: 10000
        });
        
        if (response.ok) {
          let inscriptions;
          
          // Handle GitHub API response (base64 encoded)
          if (url.includes('api.github.com')) {
            const data = await response.json();
            if (data.content && data.encoding === 'base64') {
              const content = Buffer.from(data.content, 'base64').toString('utf8');
              inscriptions = JSON.parse(content);
            } else {
              throw new Error('Invalid GitHub API response format');
            }
          } else {
            // Direct raw content
            inscriptions = await response.json();
          }
          
          console.log(`✅ Successfully fetched ${collectionSlug} from ${url}`);
          
          return {
            slug: collectionSlug,
            name: collectionSlug, // You might want to extract name from somewhere
            inscriptions: Array.isArray(inscriptions) ? inscriptions : [],
            source: 'github',
            fetchedAt: new Date().toISOString(),
            sourceUrl: url
          };
        } else if (response.status === 404) {
          lastError = new Error(`Collection ${collectionSlug} not found at ${url}`);
          continue; // Try next pattern
        } else {
          lastError = new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
          continue; // Try next pattern
        }
      } catch (error) {
        lastError = error;
        console.warn(`Failed with pattern ${pattern}:`, error.message);
        // Continue to next pattern
      }
    }

    // If all patterns failed, check if collection exists in the repo
    const repoUrl = `https://github.com/${collectionsRepo}/tree/main/collections/${collectionSlug}`;
    const repoResponse = await fetch(repoUrl, { method: 'HEAD' });
    
    if (repoResponse.ok) {
      throw new Error(`Collection ${collectionSlug} exists in repository but inscriptions.json is missing or inaccessible`);
    } else {
      throw new Error(`Collection ${collectionSlug} not found in repository`);
    }
    
  } catch (error) {
    console.error(`GitHub fetch error for ${collectionSlug}:`, error);
    throw error;
  }
}