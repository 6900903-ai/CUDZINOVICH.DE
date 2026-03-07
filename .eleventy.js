module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/assets");

  eleventyConfig.addGlobalData("currentYear", () => new Date().getFullYear());
  eleventyConfig.addGlobalData("siteUrl", "https://chudzinovich.de");

  eleventyConfig.addGlobalData("nav", {
    de: [
      { url: "/", label: "HOME" },
      { url: "/technology/", label: "TECHNOLOGY" },
      { url: "/financials/", label: "FINANCIALS" },
      { url: "/investors/", label: "INVESTORS" },
      { url: "/contact/", label: "CONTACT" },
      { url: "/privacy/", label: "PRIVACY" },
      { url: "/imprint/", label: "IMPRINT" }
    ],
    en: [
      { url: "/", label: "HOME" },
      { url: "/technology/", label: "TECHNOLOGY" },
      { url: "/financials/", label: "FINANCIALS" },
      { url: "/investors/", label: "INVESTORS" },
      { url: "/contact/", label: "CONTACT" },
      { url: "/privacy/", label: "PRIVACY" },
      { url: "/imprint/", label: "IMPRINT" }
    ],
    ru: [
      { url: "/", label: "ГЛАВНАЯ" },
      { url: "/technology/", label: "ТЕХНОЛОГИЯ" },
      { url: "/financials/", label: "ФИНАНСЫ" },
      { url: "/investors/", label: "ИНВЕСТОРАМ" },
      { url: "/contact/", label: "КОНТАКТЫ" },
      { url: "/privacy/", label: "КОНФИДЕНЦИАЛЬНОСТЬ" },
      { url: "/imprint/", label: "ИМПРИНТ" }
    ]
  });

  eleventyConfig.addFilter("canonical", (page, lang, siteUrl) => {
    const path = page.url || "/";
    const cleanPath = path.replace(new RegExp(`^/${lang}/`), "/");
    return `${siteUrl}/${lang}${cleanPath}`.replace(/(?<!:)\/\//g, "/");
  });

  eleventyConfig.addFilter("i18nUrl", (url, targetLang, currentLang) => {
    if (!url) return `/${targetLang}/`;
    return url.replace(new RegExp(`^/${currentLang}/`), `/${targetLang}/`);
  });

  return {
    dir: { input: "src", output: "_site", includes: "_includes" },
    templateFormats: ["njk", "html", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};