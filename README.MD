# hta-drop-target
make a drag & drop target on HTML Application (HTA), which can recieve a file path from Windows Explorer.

# mechanism
hta-drop-target uses a WebBrowser Control(ActiveX) as a drop target. When the control get a dropped file, it trys to navigate to the path of the file, and fires several events with parameter include the **path**.

# requirement
Windows OS with Internet Explorer 6 or later. 

# installation

download [hta-drop-target.js](./release/hta-drop-target.js?raw=true) and load it from your HTA file.
```
<script src="hta-drop-target.js"></script>
```

### npm:
```
npm install hta-drop-target
```
```
import HtaDropTarget from "hta-drop-target";
```

# sample code
sample.HTA
```
<body bgcolor="gray">
<div id="target" style="border:5px double red; width:320px; height:240px;"></div>

<script src="../dist/hta-drop-target.js"></script>
<script>

new HtaDropTarget(target, {
  html: '<font color="red" size="7">DROP HERE</font>', // target's html contents
  htmlFile: './blank.html', // the html file is not necessary but it is required for more stable operation
  //autoHide: true, // show/hide the drop target element automatically during dragging operation
  
  // "ondrop" event handler receives the dropped file's path
  ondrop: function (path) {
    alert(path);
  }
});

</script>
</body>

```

# API Document
under construction.

