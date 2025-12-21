import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  const locale = (await requestLocale) || "en";

  // Load all translation files and merge them
  try {
    const [navigation, home, login, footer] =
      await Promise.all([
        import(`../messages/${locale}/navigation.json`),
        import(`../messages/${locale}/home.json`),
        import(`../messages/${locale}/login.json`),
        import(`../messages/${locale}/footer.json`),
      ]);

    return {
      locale,
      messages: {
        navigation: navigation.default,
        home: home.default,
        login: login.default,
        footer: footer.default,
      },
    };
  } catch (error) {
    // Fallback to English if locale files don't exist
    console.warn(
      `Translation files for locale '${locale}' not found, falling back to English`,
    );
    const [navigation, home, login, footer] =
      await Promise.all([
        import(`../messages/en/navigation.json`),
        import(`../messages/en/home.json`),
        import(`../messages/en/login.json`),
        import(`../messages/en/footer.json`),
      ]);

    return {
      locale: "en",
      messages: {
        navigation: navigation.default,
        home: home.default,
        login: login.default,
        footer: footer.default,
      },
    };
  }
});
