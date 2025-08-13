# About ThemeBuilder

ThemeBuilder is a tool that allows you to easily style your web UI including the [supported Kendo UI and Telerik components](https://docs.telerik.com/themebuilder/introduction#supported-telerik-and-kendo-ui-web-components) and any custom HTML.

ThemeBuilder enables developers to apply the styles from their style guide or design system to the components by using a generated [zip package](#about-this-zip-package) that contains Sass, CSS, and custom font files.

> Custom font files are available only if you have added them to your project.

## About this Zip Package

This zip package contains:

* The Sass, CSS, and custom font files from your ThemeBuilder project. These assets are in a folder named after your ThemeBuilder project.


> Kendo Font Icons font file is included only if your project uses font icons instead of SVG icons.

How to use these styles depends on your technology of choice:

     * [Using the zip package with the React, Angular, or Vue](#using-the-themebuilder-output-in-react-angular-or-vue).
     
     * [Using the zip package with the Blazor](#using-the-themebuilder-output-in-blazor).

     * [Using the zip package with the jQuery](#using-the-themebuilder-output-in-jquery).

     * [Using the zip package with the ASP.NET Core](#using-the-themebuilder-output-in-asp.net-core).

     * [Using the zip package with the ASP.NET MVC](#using-the-themebuilder-output-in-asp.net-mvc).

     * [Using the zip package with the PHP](#using-the-themebuilder-output-in-php).

     * [Using the zip package with the JSP](#using-the-themebuilder-output-in-jsp).

### Exporting the Selected Components

If you have used the [Export Selected](https://docs.telerik.com/themebuilder/exported-package#exporting-the-selected-components) option, the ZIP contains the described assets only for the components you have selected in the ThemeBuilder.

## Supported Telerik and Kendo UI Web Components

The team behind ThemeBuilder works constantly to expand the list of supported Telerik and Kendo UI web components that you can style with ThemeBuilder. Currently, ThemeBuilder supports the following component suites:

* [KendoReact](https://www.telerik.com/kendo-react-ui/)
* [Kendo UI for Angular](https://www.telerik.com/kendo-angular-ui)
* [Kendo UI for Vue](https://www.telerik.com/kendo-vue-ui)
* [Telerik UI for Blazor](https://www.telerik.com/blazor-ui)
* [Telerik UI for jQuery](https://www.telerik.com/kendo-jquery-ui)
* [Telerik UI for ASP.NET Core](https://www.telerik.com/aspnet-core-ui)
* [Telerik UI for ASP.NET MVC](https://www.telerik.com/aspnet-mvc)
* [Telerik UI for PHP](https://www.telerik.com/php-ui)
* [Telerik UI for JSP](https://www.telerik.com/jsp-ui)
## Using the ThemeBuilder output in React, Angular, or Vue

The generated ThemeBuilder output is packaged as an npm package. To use it, copy the ThemeBuilder package to your application and use it as a standard npm package:

1. Extract the zip archive.

1. Navigate to the folder named after your ThemeBuilder project, and then install the npm modules:

    ```shell
    cd insight-theme
    npm install
    ```

1. Add the ThemeBuilder package in your application's <code>package.json</code> file:

    ```js
      "dependencies": {
        ...
        "insight-theme": "file:./insight-theme"
      },
    ```

    >The <code>file:./insight-theme</code> value is the relative path to the <code>insight-theme</code> folder. For example, if you put it next to your application folder, the value will be <code>file:../insight-theme</code>.

1. Install the ThemeBuilder package in your project:

    ```shell
    cd ..
    npm install
    ```

1. Use either of the following approaches to import the theme package styles into your application: 

    - Import SASS in your <code>index.scss</code> file:

      ```js
      @use 'insight-theme/dist/scss' as *;
      ```

    - Import SASS in your application root JS (e.g. <code>app.js</code>) file:

      ```js
      import 'insight-theme/dist/scss/index.scss';
      ```

    - Import CSS in your application root JS (e.g. <code>app.js</code>) file:

      ```js
      import 'insight-theme/dist/css/insight-theme.css';
      ```

  > Make sure the theme package styles are imported before all your application-specific styles.

  > Since generated package already contains a reference to the Kendo theme, you do not need to manually add it to your project.

## Using the ThemeBuilder Output in Blazor

The generated ThemeBuilder output is packaged as an npm package. To use it, in a Blazor application:

1. Extract the zip archive.

1. Navigate to the <code>insight-theme/dist/css</code> folder.

1. Copy the ready to use pre-built css file named <code>insight-theme.css</code>.

> Make sure that if you are using custom fonts and/or Kendo Font Icons in your project, to copy the content of <code>insight-theme/dist/fonts</code> folder into your application on the same level as you have copied the <code>insight-theme/dist/css</code> folder.

1. Paste the <code>insight-theme.css</code> file in your application, usually in the <code>wwwroot</code> folder. For example, it can be in a folder called <code>myCustomTelerikThemes</code>.

1. If you use custom fonts in your ThemeBuilder project, copy the <code>insight-theme/dist/fonts</code> folder and paste it one level up relative to the <code>insight-theme.css</code>.  Skip this step if your project doesn't use custom fonts. 

1. Include the custom stylesheet file in the head tag of your index document (by default <code>wwwroot/index.html</code> for WebAssembly apps and <code>~/Pages/_Host.cshtml</code> for server-side Blazor apps). The document could look like this:

```html
<head>
    <!-- More content can be present here -->

    <link rel="stylesheet" href="myCustomTelerikThemes/insight-theme.css" />

    <!-- More content can be present here -->
</head>
```

> Make sure that you do not have another Telerik Theme that is referenced in the application. If you are using a built-in theme, you must remove its <code><link></code> element.
To use the ThemeBuilder Sass output in your application, you need the files in the <code>dist/scss</code> and <code>dist/fonts</code> folders. For the detailed steps on using the <code>.scss</code> files, refer to the [Custom Themes](https://docs.telerik.com/blazor-ui/styling-and-themes/custom-theme#using-the-build-process-of-the-application) article in the UI for Blazor docs.


## Using the ThemeBuilder Output in jQuery

The generated ThemeBuilder output is packaged as an npm package. To use it, in a jQuery application:

1. Extract the zip archive.

1. Navigate to the <code>insight-theme/dist/css</code> folder.

1. Copy the ready to use pre-built css file named <code>insight-theme.css</code>.

> Make sure that if you are using custom fonts and/or Kendo Font Icons in your project, to copy the content of <code>insight-theme/dist/fonts</code> folder into your application on the same level as you have copied the <code>insight-theme/dist/css</code> folder.

1. Paste the <code>insight-theme.css</code> file in your application, usually in the <code>styles</code> folder. Under <code>styles</code>, you can create another folder for the CSS file, for example <code>myCustomTelerikThemes</code>.

1. If you use custom fonts in your ThemeBuilder project, copy the <code>insight-theme/dist/fonts</code> folder and paste it one level higher relative to the <code>insight-theme.css</code>. Skip this step if your project doesn't use custom fonts. 

1. Include the custom stylesheet file in the head tag of your index document (by default, <code>index.html</code>). The document could look like this:

```html
<head>
    <!-- More content can be present here -->

    <link rel="stylesheet" href="myCustomTelerikThemes/insight-theme.css" />

    <!-- More content can be present here -->
</head>
```

> Make sure that you do not have another Telerik Theme that is referenced in the application. If you are using a built-in theme, you must remove its <code><link></code> element.
## Using the ThemeBuilder Output in ASP.NET Core

The generated ThemeBuilder output is packaged as an npm package. To use it, in a ASP.NET Core application:

1. Extract the zip archive.

1. Navigate to the <code>insight-theme/dist/css</code> folder.

1. Copy the ready to use pre-built css file named <code>insight-theme.css</code>.

> Make sure that if you are using custom fonts and/or Kendo Font Icons in your project, to copy the content of <code>insight-theme/dist/fonts</code> folder into your application on the same level as you have copied the <code>insight-theme/dist/css</code> folder.

1. Paste the <code>insight-theme.css</code> file in your application, usually in the <code>wwwroot</code> folder. Under <code>wwwroot</code>, you can create another folder for the CSS file, for example <code>myCustomTelerikThemes</code>.

1. If you use custom fonts in your ThemeBuilder project, copy the <code>insight-theme/dist/fonts</code> folder and paste it one level higher relative to the <code>insight-theme.css</code>. Skip this step if your project doesn't use custom fonts. 

1. Include the custom stylesheet file in the head tag of your index document (by default, <code>~/Views/Shared_Layout.cshtml</code>). The document could look like this:

```html
<head>
    <!-- More content can be present here -->

    <link rel="stylesheet" href="myCustomTelerikThemes/insight-theme.css" />

    <!-- More content can be present here -->
</head>
```


## Using the ThemeBuilder Output in ASP.NET MVC

The generated ThemeBuilder output is packaged as an npm package. To use it, in a ASP.NET MVC application:

1. Extract the zip archive.

1. Navigate to the <code>insight-theme/dist/css</code> folder.

1. Copy the ready to use pre-built css file named <code>insight-theme.css</code>.

> Make sure that if you are using custom fonts and/or Kendo Font Icons in your project, to copy the content of <code>insight-theme/dist/fonts</code> folder into your application on the same level as you have copied the <code>insight-theme/dist/css</code> folder.

1. Paste the <code>insight-theme.css</code> file in your application, usually in the <code>Content</code> folder. Under <code>Content</code>, you can create another folder for the CSS file, for example <code>myCustomTelerikThemes</code>.

1. If you use custom fonts in your ThemeBuilder project, copy the <code>insight-theme/dist/fonts</code> folder and paste it one level higher relative to the <code>insight-theme.css</code>. Skip this step if your project doesn't use custom fonts. 

1. Include the custom stylesheet file in the head tag of your index document (by default, <code>~/Views/Shared_Layout.cshtml</code>). The document could look like this:

```html
<head>
    <!-- More content can be present here -->

    <link rel="stylesheet" href="myCustomTelerikThemes/insight-theme.css" />

    <!-- More content can be present here -->
</head>
```


## Using the ThemeBuilder Output in PHP

The generated ThemeBuilder output is packaged as an npm package. To use it, in a PHP application:

1. Extract the zip archive.

1. Navigate to the <code>insight-theme/dist/css</code> folder.

1. Copy the ready to use pre-built css file named <code>insight-theme.css</code>.

> Make sure that if you are using custom fonts and/or Kendo Font Icons in your project, to copy the content of <code>insight-theme/dist/fonts</code> folder into your application on the same level as you have copied the <code>insight-theme/dist/css</code> folder.

1. Paste the <code>insight-theme.css</code> file in your application, usually in the <code>content</code> folder. Under <code>content</code>, you can create another folder for the CSS file, for example <code>myCustomTelerikThemes</code>.

1. If you use custom fonts in your ThemeBuilder project, copy the <code>insight-theme/dist/fonts</code> folder and paste it one level higher relative to the <code>insight-theme.css</code>. Skip this step if your project doesn't use custom fonts. 

1. Include the custom stylesheet file in the head tag of your index document (by default, <code>index.php</code>). The document could look like this:

```html
<head>
    <!-- More content can be present here -->

    <link rel="stylesheet" href="myCustomTelerikThemes/insight-theme.css" />

    <!-- More content can be present here -->
</head>
```

## Using the ThemeBuilder Output in JSP

The generated ThemeBuilder output is packaged as an npm package. To use it, in a JSP application:

1. Extract the zip archive.

1. Navigate to the <code>insight-theme/dist/css</code> folder.

1. Copy the ready to use pre-built css file named <code>insight-theme.css</code>.

> Make sure that if you are using custom fonts and/or Kendo Font Icons in your project, to copy the content of <code>insight-theme/dist/fonts</code> folder into your application on the same level as you have copied the <code>insight-theme/dist/css</code> folder.

1. Paste the <code>insight-theme.css</code> file in your application, usually in the <code>src/main/webapp/resources</code> folder. Under <code>src/main/webapp/resources</code>, you can create another folder for the CSS file, for example <code>myCustomTelerikThemes</code>.

1. If you use custom fonts in your ThemeBuilder project, copy the <code>insight-theme/dist/fonts</code> folder and paste it one level higher relative to the <code>insight-theme.css</code>. Skip this step if your project doesn't use custom fonts. 

1. Include the custom stylesheet file in the head tag of your index document (by default, <code>views/index.jsp</code>). The document could look like this:

```html
<head>
    <!-- More content can be present here -->

    <link rel="stylesheet" href="myCustomTelerikThemes/insight-theme.css" />

    <!-- More content can be present here -->
</head>
```

> Make sure that you do not have another Telerik Theme that is referenced in the application. If you are using a built-in theme, you must remove its <code><link></code> element.