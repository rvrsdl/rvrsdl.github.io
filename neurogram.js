class ANN {

    constructor (layers) {
        // Layers should be list of layer sizes (includin input and output layer)
        // Initialise weights
        this.wgts = new Array(layers.length-1);
        // Create random weights between each layer
        for (var i=0; i<this.wgts.length; i++) {
            this.wgts[i] = nj.random([layers[i+1],layers[i]]).subtract(0.5).multiply(8.0) // minus 0.5 to centre on zero.
        }
    }

    feedforward(aVec) {
        // Can cope with multiple vectors at once (matrix shape should be [inputVecSize, N])
        // Output will then be shape [outputVecSize, N]
        for (var i=0; i<this.wgts.length-1; i++) {
            aVec = nj.tanh(nj.dot(this.wgts[i], aVec));
        }
        // On final layer use sigmoid activation
        aVec = nj.sigmoid(nj.dot(this.wgts[i], aVec));
        return aVec;
    }
}

function getCoordVecs(img_w, img_h) {
    // Get matrix of x & y coords for input to network.
    var x_array = nj.arange(-0.5, 0.5, 1/img_w);
    var y_array = nj.arange(-0.5, 0.5, 1/img_h);
    // meshgrid code:
    var sz = x_array.size * y_array.size;
    var xrep = nj.concatenate(Array(y_array.size).fill(x_array.reshape(1,x_array.size)));
    var yrep = nj.concatenate(Array(x_array.size).fill(y_array.reshape(y_array.size,1)));
    return nj.concatenate([xrep.reshape(sz,1), yrep.reshape(sz,1)]);
}

function createImg(bias, net) {
    net = net || new ANN([3,5,3]); // default network (3 out fo RGB, we'll set A to 1)
    // Concat bias vector
    if (typeof(bias) == 'number') {
        bias = [bias];
    }
    var inMat = coords;
    var biasMat;
    for (var i=0; i<bias.length; i++) {
        biasMat = nj.array(Array(coords.shape[0]).fill(bias[i])).reshape(coords.shape[0],1); // hacky sort of repmat
        inMat = nj.concatenate(inMat,biasMat);
    } 
    //assert(inMat.shape[1]==net.wgts[0].shape[1],'Network input layer is wrong size.')
    var outMat = net.feedforward(inMat.T).T;
    // Now add Alpha (always 1 because we don't want transparent)
    outMat = nj.concatenate(outMat, nj.ones([outMat.shape[0],1]));
    // html canvas wants a 1D array of every coordinat RGBA data (R,G,B,A,R,G,B,A,...)
    imgData = Uint8ClampedArray.from(outMat.flatten().multiply(255.0).tolist())
    return imgData;
}

function displayImg(canv, imgData) {
    imdatobj = new ImageData(imgData, imgSize, imgSize)
    var ctx = canv.getContext("2d");
    ctx.putImageData(imdatobj, 0, 0);
}

function changeImageBias(evt) {
    // Recreate the image with the bias based on the mouse position
    var el = evt.currentTarget;
    var ix = Array.from(el.parentElement.children).indexOf(el);
    console.log(`canvas ${ix} mousemoved`);
    var bias = [evt.offsetX/(imgSize*2), evt.offsetY/(imgSize*2)]; // create bias based on mouse position.
    var imgData = createImg(bias, networks[ix]);
    displayImg(el, imgData);
}

function changeImageNetwork(evt) {
    var el = evt.currentTarget;
    var ix = Array.from(el.parentElement.children).indexOf(el);
    console.log(`canvas ${ix} clicked`);
    networks[ix] = new ANN(defaultLayers);
    var imgData = createImg(defaultBias, networks[ix]);
    displayImg(canvas[ix], imgData);
    // TODO: could increase number of layers on each click.
}

var imgSize = 200;
var canvas = document.getElementsByTagName("canvas");
var coords = this.getCoordVecs(imgSize, imgSize, 1);
var networks = new Array(canvas.length); // one ANN per canvas
var defaultBias = [0.5,0.5];
var defaultLayers = [4,16,16,16,3];
for (var i=0; i<canvas.length; i++) {
    canvas[i].width = imgSize;
    canvas[i].height = imgSize;
    networks[i] = new ANN(defaultLayers);
    var imgData = createImg(defaultBias, networks[i]);
    displayImg(canvas[i], imgData);

    canvas[i].addEventListener("mousemove", changeImageBias);
    canvas[i].addEventListener("click", changeImageNetwork);
}
document.getElementById("instructions").innerHTML = "Move the mouse slowly over an image to change it gradually. Click to change it completely.";
