import puppeteer from 'puppeteer'

/**
 * Get site-specific selectors for popular job boards
 */
function getSiteSelectors(url: string): string[] {
  const domain = new URL(url).hostname

  // Site-specific selectors for better extraction
  if (domain.includes('linkedin.com')) {
    return [
      '.jobs-description__content',
      '.jobs-description',
      '.description__text',
      '[class*="job-description"]',
      '[class*="jobs-description"]',
      '.show-more-less-html',
    ]
  } else if (domain.includes('naukri.com')) {
    return [
      '.jd-container',
      '.job-description',
      '[class*="job-desc"]',
      '[class*="jd-"]',
    ]
  } else if (domain.includes('glassdoor.com')) {
    return [
      '.jobDescriptionContent',
      '[class*="JobDetails"]',
      '[data-test="jobDescriptionContent"]',
      '.desc',
    ]
  } else if (domain.includes('indeed.com')) {
    return [
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText',
      '[class*="jobsearch-JobComponent-description"]',
    ]
  } else if (domain.includes('monster.com')) {
    return ['.job-description', '#JobDescription', '[class*="job-desc"]']
  } else if (domain.includes('dice.com')) {
    return ['#jobdescSec', '.job-description', '[class*="job-description"]']
  }

  // Generic fallback selectors
  return [
    'main',
    '[role="main"]',
    '.job-description',
    '.job-details',
    '#job-description',
    '#jobDescription',
    '[class*="job-desc"]',
    '[class*="description"]',
    'article',
  ]
}

/**
 * Scrape job description from a URL
 * Supports LinkedIn, Naukri, Glassdoor, Indeed, Monster, Dice and generic job sites
 */
export async function scrapeJobDescription(url: string): Promise<string> {
  let browser

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
      ],
    })

    const page = await browser.newPage()

    // Set viewport for better rendering
    await page.setViewport({ width: 1920, height: 1080 })

    // Set realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    // Set extra headers to appear more like a real browser
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    })

    // Navigate to the page
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })

    // Try to wait for a relevant selector (best effort) before falling back
    for (const selector of getSiteSelectors(url)) {
      try {
        await page.waitForSelector(selector, { timeout: 2500 })
        break
      } catch (_) {
        // ignore and try next
      }
    }

    // Small extra delay for hydration
    await new Promise((resolve) => setTimeout(resolve, 1200))

    // Get site-specific selectors
    const siteSelectors = getSiteSelectors(url)

    // Extract text from the page
    const result = await page.evaluate((selectors) => {
      // @ts-ignore - Running in browser context where document exists
      const scripts = document.querySelectorAll(
        'script, style, nav, header, footer, [role="navigation"], [role="banner"]'
      )
      // @ts-ignore
      scripts.forEach((el) => el.remove())

      // Try site-specific selectors first
      for (const selector of selectors) {
        // @ts-ignore - Running in browser context where document exists
        const element = document.querySelector(selector)
        if (
          element &&
          element.textContent &&
          element.textContent.trim().length > 100
        ) {
          return {
            text: element.textContent,
            selectorUsed: selector,
            source: 'selector',
          }
        }
      }

      // Fallback: try to find the largest text block
      // @ts-ignore
      const allDivs = Array.from(document.querySelectorAll('div, section'))
      let maxLength = 0
      let bestContent = ''

      // @ts-ignore
      allDivs.forEach((div) => {
        // @ts-ignore
        const text = div.textContent?.trim() || ''
        // Look for divs with substantial text that might be job descriptions
        if (
          text.length > maxLength &&
          text.length > 200 &&
          text.length < 50000
        ) {
          maxLength = text.length
          bestContent = text
        }
      })

      if (bestContent) {
        return {
          text: bestContent,
          selectorUsed: 'largest-div',
          source: 'largest-div',
        }
      }

      // Last resort: get body text
      // @ts-ignore - Running in browser context where document exists
      return {
        text: document.body.textContent,
        selectorUsed: 'body',
        source: 'body',
      }
    }, siteSelectors)

    const content = result?.text || ''

    // Clean up the text
    const cleanedText = (content || '')
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim()

    const selectorUsed = result?.selectorUsed || 'unknown'
    const source = result?.source || 'unknown'

    const looksLikeAuthWall =
      /sign in|sign up|join now|account|login|captcha/i.test(
        cleanedText.slice(0, 500)
      )

    console.log(
      '[jobScraper] extracted',
      JSON.stringify({
        url,
        selectorUsed,
        source,
        length: cleanedText.length,
        preview: cleanedText.slice(0, 160),
        authWall: looksLikeAuthWall,
      })
    )

    if (!cleanedText || cleanedText.length < 50) {
      throw new Error(
        'Could not extract meaningful content. The site may require authentication or block scraping.'
      )
    }

    if (looksLikeAuthWall) {
      throw new Error(
        'This page appears to require login or shows an auth/captcha wall. Please paste the job description text instead.'
      )
    }

    return cleanedText
  } catch (error) {
    const errorMessage = (error as Error).message

    // Provide helpful error messages for common issues
    if (errorMessage.includes('Navigation timeout')) {
      throw new Error(
        'Failed to load the page - the site took too long to respond. Try again or use a different URL.'
      )
    } else if (errorMessage.includes('authentication')) {
      throw new Error(
        'This job posting may require login to view. Please copy and paste the job description text instead.'
      )
    }

    throw new Error(`Failed to scrape job description: ${errorMessage}`)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}
