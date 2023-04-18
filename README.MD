# hta-drop-target
make a drop target on HTML Application (HTA), which can recieve a dropped file path from Windows Explorer.

# mechanism
hta-drop-target uses WebBrowser Control(ActiveX) as a drop target. When the control get a dropped file, it trys to navigate to the path of the file, and fires several events with parameter include the **path**. This code reads that.

# requirement
Windows OS with Internet Explorer 9 or later. 

*On IE6-8, it can only gets a folder.

# installation

Save [hta-drop-target.js](./release/hta-drop-target.js) to your local disk.
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
  html: '<font color="red" size="7">DROP HERE</font>',
  //htmlFilePath: './blank.html', // for more stability it needs a blank file which exists in the local disk.
  
  // "ondrop" event handler gets the dropped file's path
  ondrop: function (path) {
    alert(path);
  }
});

</script>
</body>


```

more complex sample:

[test.ts](./test/test.ts)

# API Document
under construction.
