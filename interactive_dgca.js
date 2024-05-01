//Wishlist of things to add
// 1. Select component of graph and just see how that evolves (discoard other components)
// 2. Plot spacetime diagram in the lowe rleft as we go along.
// 3. Interactive matrix maths illustration (show calc for selected node)
// 4. DONE (not tested with seeds) Submit settings form (halfway there, just need to "apply" the input) 
// 5. Preset examples (seed graph and rule)
// 6. Versions 2 & 4!

var CHILD_WINDOW = false;
if (typeof window.passed !== 'undefined') {
    CHILD_WINDOW = true;
}

const ALLSTATES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
// using the "Dutch Field" colour palette from here: https://www.heavy.ai/blog/12-color-palettes-for-telling-better-stories-with-your-data
//const COLOURS = ["#e60049", "#0bb4ff", "#e6d800", "#50e991", "#9b19f5", "#ffa300", "#dc0ab4", "#b3d4ff", "#00bfa0"]
//const COLOURS = ["DarkRed","DarkGreen","DarkBlue","DarkMagenta","DarkOrange","DarkCyan","DarkSlateGray","DarkSalmon"];
var VERSION = 'v3';
var TIMESTEP = 0;
var NUMSTATES = 0;
var STATES = [];
var RULE = {};
var SEEDGRAPH = {};
var next_node_id = 0;
var cy = {}; // To hold cytoscape variable.
var step_pause = 2000; // Wait between steps in continual run (in ms)
var run_timestamp; // serves as a unique ID for the run (for downloading data)

var model_version_dropdown = document.getElementById("model-version-dropdown")
var num_states_dropdown = document.getElementById("num-states-dropdown");
var seed_graph_dropdown = document.getElementById("seed-graph-dropdown");
var json_settings_textarea = document.getElementById("json-settings-textarea");
var rule_size_info = document.getElementById("rule-size");
var play_pause_btn = document.getElementById("play_pause");
var anim_layout_checkbox = document.getElementById('anim-layout');
var anim_2step_checkbox = document.getElementById('anim-2step');
var step_count_info = document.getElementById("step-count");
var node_count_info = document.getElementById("node-count");
var component_count_info = document.getElementById("component-count");

document.getElementById("redo-layout").addEventListener("click", _ => redoLayout(true));
document.getElementById("step_fwd").addEventListener("click", stepForward); //applyTransitions
document.getElementById("step_bck").addEventListener("click", stepBack);
document.getElementById("reset_button").addEventListener("click", resetCytoscape);
document.getElementById("submit-json-settings").addEventListener("click", submitJSONSettings);
document.getElementById("submit-dropdown-settings").addEventListener("click", submitDropdownSettings);
play_pause_btn.addEventListener("click", toggleRun);
document.getElementById("save_img_button").addEventListener("click", saveImage);
document.getElementsByName("selfloop-style").forEach((btn) => {
    btn.addEventListener("change", function(event) {
        setSelfLoopStyle(event.target.value);
    });
});
document.getElementById("isolate-component").addEventListener("click", isolateComponent);
document.getElementById("newtab-component").addEventListener("click", newWindow);

var cy_style = [
    {
        selector: 'edge',
        style: {
            'width': 1,
            'line-color': '#ffffff',
            'line-opacity': '0.7',
            'mid-target-arrow-color': '#ffffff',
            'mid-target-arrow-shape': 'vee', // haystack edges (the fastest) only support mid arrows.
            'curve-style': 'haystack',//'straight', // apparently faster than 'bezier' (curved)
            'haystack-radius': 0, // ie. edges go to centr of node.
        }
    },
    {
        // haystack edges can't do self-loop so we need a different style for them (at the cost of speed)
        selector: 'edge:loop',
        style: {
            // 'width': 1,
            // 'line-color': '#ffffff',
            // 'mid-target-arrow-color': '#ffffff',
            // 'mid-target-arrow-shape': 'vee', // haystack edges (the fastest) only support mid arrows.
            'curve-style': 'bezier',//'straight', // apparently faster than 'bezier' (curved)
            //'loop-sweep': '-90deg'
        }
    },
    {
        selector: 'node',
        style: {
            'width': 10,
            'height': 10
        }
    },
    {
        selector: 'node:selected',
        style: {
            'border-width': 1,
            'border-color': '#808080'
        }
    },
    {
        selector: 'node.deleting',
        style: {
            'background-fill': 'radial-gradient',
            'background-gradient-stop-colors': ['red', 'white'],
            'background-gradient-stop-positions': ['0%', '50%']
        }
    },
    {
        selector: 'node.splitting',
        style: {
            'border-width': 1,
            'border-color': 'lime',
            // 'ghost': 'yes',
            // 'ghost-offset-x': 5,
            // 'ghost-offset-y': 5,
            // 'ghost-opacity': 0.6
        }
    },
    {
        selector: 'node.component-selected',
        style: {
            'border-width': 2,
            'border-color': '#4bf542',
        }
    },
    {
        selector: 'edge.component-selected',
        style: {
            'width': 2,
            'line-color': '#4bf542',
            'line-opacity': '1',
            'mid-target-arrow-color': '#4bf542',
        }
    }
];
// Make each state node have a different colour
ALLSTATES.forEach((st, idx) => {
    cy_style.push(
        {
            selector: `node[state="${st}"]`,
            style: {
                shape: 'ellipse',
                'background-color': COLOURS[idx],
                //label: 'data(id)'
            }
        }
    )
});

const layoutOptions = {
    name: 'fcose',
    quality: "default",
    randomize: true,
    animate: false,
    animationDuration: 500,
    animationEasing: "ease-in-out-quad", // Easing of animation, if enabled
    fit: true, // Fit the viewport to the repositioned nodes
    padding: 30, // Padding around layout
    // Whether or not simple nodes (non-compound nodes) are of uniform dimensions
    uniformNodeDimensions: true,
    // Whether to pack disconnected components - cytoscape-layout-utilities extension should be registered and initialized
    packComponents: true,
    // False for random, true for greedy sampling
    samplingType: false,
    // Sample size to construct distance matrix
    sampleSize: 25,
    // Separation amount between nodes
    nodeSeparation: 75,
    // Power iteration tolerancetrue
    piTol: 0.0000001,
    // Node repulsion (non overlapping) multiplier
    nodeRepulsion: node => 4500,
    // Ideal edge (non nested) length
    idealEdgeLength: edge => 50,
    // Divisor to compute edge forces
    edgeElasticity: edge => 0.45,
    // Maximum number of iterations to perform - this is a suggested value and might be adjusted by the algorithm as required
    numIter: 2500,
};


window.onload = initPage();

function defaultSettings() {
    model_version_dropdown.value = 'v3';
    num_states_dropdown.value = 3;
    initNumStates();
    seed_graph_dropdown.value = 'arrow';
    seedGraphChooser();
    animCheckBox(); //for initial state
    setJSONSettings();
}

// function passedSettings() {
//     model_version_dropdown.value = window.passed.version;
//     num_states_dropdown.value = window.passed.num_states;
//     seed_graph_dropdown.value = 'custom-JSON'; // because we are starting with the passed graph
//     SEEDGRAPH = window.passed.cy_eles;
//     RULE = window.passed.rule;
//     VERSION = window.passed.version;
//     NUMSTATES = window.passed.num_states;
//     STATES = ALLSTATES.slice(0, NUMSTATES);
//     animCheckBox(); // don't bother replicating state of this from parent window
//     setJSONSettings();
//     next_node_id = window.passed.next_node_id;
// }


function initPage() {
    defaultSettings();
    cy = initCytoscape();
    cy.ready(_ => {
        refreshEvents();       
    });
    if (CHILD_WINDOW) {
        // Bit of a roundabout way of doing it, but re-uses existing code.
        json_settings_textarea.value = window.passed;
        submitJSONSettings();
    }
}

function initNumStates() {
    // Set the STATES and RULE vars
    NUMSTATES = num_states_dropdown.value;
    VERSION = model_version_dropdown.value;
    STATES = ALLSTATES.slice(0, NUMSTATES);
    if (VERSION == 'v2') {
        RULE = nj.random([2 + STATES.length, (2 * STATES.length) + 1]).multiply(2).subtract(1); // *2-1 to put in range (-1,1)
    } else if (VERSION == 'v3') {
        RULE = nj.random([3 + 12 + STATES.length, (2 * STATES.length) + 1]).multiply(2).subtract(1); // *2-1 to put in range (-1,1)
    } else if (VERSION == 'v4') {
        alert('Version 4 not yet implemented.\nSwitching to version 3.');
        // set to v3 and call again.
        model_version_dropdown.value = 'v3';
        initNumStates();
    }
    rule_size_info.innerHTML = RULE.size;
    //makeNeighCountTable();
}

function seedGraphChooser() {
    //uses the seed graph specified in the dropdown to assign to the global seed_graph variable.
    // assigns states randomly.
    if (seed_graph_dropdown.value == 'arrow') {
        SEEDGRAPH = {
            nodes: [
                { data: { id: 0, state: choose(STATES) } },
                { data: { id: 1, state: choose(STATES) } },
                { data: { id: 2, state: choose(STATES) } },
                { data: { id: 3, state: choose(STATES) } }
            ],
            edges: [
                { data: { id: '0->1', source: 0, target: 1 } },
                { data: { id: '0->2', source: 0, target: 2 } },
                { data: { id: '1->2', source: 1, target: 2 } },
                { data: { id: '2->3', source: 2, target: 3 } }
            ]
        };
    } else if (seed_graph_dropdown.value == 'single_node') {
        SEEDGRAPH = {
            nodes: [
                { data: { id: 0, state: choose(STATES) } }
            ],
            edges: [
                { data: { id: '0->0', source: 0, target: 0 } }
            ]
        };
    } else if (seed_graph_dropdown.value == 'ring4') {
        SEEDGRAPH = {
            nodes: [
                { data: { id: 0, state: choose(STATES) } },
                { data: { id: 1, state: choose(STATES) } },
                { data: { id: 2, state: choose(STATES) } },
                { data: { id: 3, state: choose(STATES) } }
            ],
            edges: [
                { data: { id: '0->1', source: 0, target: 1 } },
                { data: { id: '1->2', source: 1, target: 2 } },
                { data: { id: '2->3', source: 2, target: 3 } },
                { data: { id: '3->0', source: 3, target: 0 } }
            ]
        };
    }
}

function choose(choices) {
    var index = Math.floor(Math.random() * choices.length);
    return choices[index];
}

function initCytoscape() {
    //console.log(SEEDGRAPH)
    var seed_graph_copy = JSON.parse(JSON.stringify(SEEDGRAPH)); // use a copy so that changes aren't preserved in original seed_graph so that we can reset.
    var cyx = cytoscape({
        container: document.getElementById('cy'),
        elements: seed_graph_copy,
        style: cy_style,
        layout: layoutOptions
    });
    cyx.data('prev', cyx.json());
    // reset info
    //next_node_id = cyx.nodes().length; // reset node counter
    next_node_id = maxNodeID(cyx.nodes())+1; // works if we are in child window and have been passed a graph with high ids.
    TIMESTEP = 0;
    step_count_info.innerHTML = TIMESTEP;
    node_count_info.innerHTML = cyx.nodes().length;;
    component_count_info.innerHTML = cyx.elements().components().length;
    run_timestamp = getTimestamp();
    return cyx
}

function resetCytoscape() {
    cy.destroy();
    cy = initCytoscape();
}

function maxNodeID(nodes) {
    // To find what the next node id should be.
    // Most of the time we can keep track of this as we go along, 
    // but this is useful if we are in a child window and have been passed
    // a graph with existing ids (which may be higher than the number of 
    // nodes it has).
    let max_value = 0;
    nodes.forEach(nd => {
        if (nd.id() > max_value) {
            max_value = nd.id();
        }
    })
    return Number(max_value);
}

function setJSONSettings() {
    var all_settings = { version: VERSION, num_states: NUMSTATES, rule: RULE, seed_graph: SEEDGRAPH };
    json_settings_textarea.value = JSON.stringify(all_settings);
}

function submitJSONSettings() {
    // get whatever is in the seetings textarea
    // TODO: some error checking (eg. check rule matrix is the right size)
    var settings = JSON.parse(json_settings_textarea.value);
    console.log('submitjsonsettings');
    num_states_dropdown.value = settings.num_states; // first set the dropdown to the correct value
    model_version_dropdown.value = settings.version;
    initNumStates(); // gets values from the dropdowns
    RULE = nj.array(JSON.parse(settings.rule));
    seed_graph_dropdown.value = 'custom-JSON';
    SEEDGRAPH = settings.seed_graph;
    setJSONSettings(); // just to reformat the input nicely
    resetCytoscape();
    refreshEvents();
}

function submitDropdownSettings() {
    // TODO: enable setting seed graph and model version.
    initNumStates();
    seedGraphChooser();
    setJSONSettings();
    resetCytoscape();
    refreshEvents();
}


function refreshEvents() {
    // necessary when we have added new nodes.
    cy.nodes().unbind("mouseover");
    cy.nodes().bind("mouseover", event => nodeMouseover(event.target));
    cy.nodes().unbind("mouseout");
    cy.nodes().bind("mouseout", event => nodeMouseout(event.target));
    cy.nodes().unbind("dblclick");
    cy.nodes().bind("dblclick", event => selectComponent(event.target));
}



function animCheckBox() {
    if (anim_layout_checkbox.checked) {
        anim_2step_checkbox.disabled = false;
        anim_2step_checkbox.checked = true;
        layoutOptions.animate = true;
        step_pause = 2000;
    } else {
        anim_2step_checkbox.checked = false;
        anim_2step_checkbox.disabled = true;
        layoutOptions.animate = false;
        step_pause = 1000; // can be a bit faster if not animating
    }
}

// function makeNeighCountTable() {
//     var tabledat = '<tbody>';
//     STATES.forEach(function(st, idx) {
//         tabledat += `<tr><td><span style="color:${COLOURS[idx]}">${st}</span></td><td id="${st}_in"></td><td id="${st}_out"></td><tr>`;
//     });
//     tabledat += '</tbody>';
//     document.getElementById('tableData').innerHTML = tabledat;
// }

// function fillNeighCountTable(node) {
//     var in_counts = getInNeighbourStateCounts(node);
//     var out_counts = getOutNeighbourStateCounts(node);
//     Object.entries(in_counts).forEach(([st,cnt]) => {
//         document.getElementById(`${st}_in`).innerHTML = cnt;
//     });
//     Object.entries(out_counts).forEach(([st,cnt]) => {
//         document.getElementById(`${st}_out`).innerHTML = cnt;
//     })
// }

function createNeighCountTable(node) {
    // Create and fill table all in one go, for a particular node.
    // This will be called when we mouseover a node, and will be put in the tooltip.
    var table = '<div>NeighbourCounts<table class="center"><thead><tr><th>State</th><th>In</th><th>Out</th></tr></thead><tbody>'
    var in_counts = getInNeighbourStateCounts(node);
    var out_counts = getOutNeighbourStateCounts(node);
    var node_state = node.data('state');
    STATES.forEach(function (st, idx) {
        var underline = "text-decoration-line:none;";
        if (st == node_state) {
            underline = "text-decoration-line:underline;";
        }
        table += `<tr><td><span style="color:${COLOURS[idx]};font-weight:bold;${underline}">${st}</span></td><td>${in_counts[st]}</td><td>${out_counts[st]}</td><tr>`;
    });
    table += '</tbody></table></div>';
    return table;
}

function nodeMouseover(node) {
    // All the stuff I want to happen on mouseover.
    //console.log('mouseover');
    node.select();
    makeTooltip(node);
    node.tippy.show();
}

function nodeMouseout(node) {
    // All the stuff I want to happen on mouseover.
    //var out_idx = getNeighbourStateOrder(node);
    //unHighlightTableRow(out_idx);
    node.unselect();
    node.tippy.hide();
}

function selectComponent(nd) {
    var comp = nd.component();
    comp.toggleClass('component-selected');
    // select all the nodes two so that component can be dragged as a group
    // this doesn't seem to be working...
    comp.nodes('node.component-selected').select();
}

function makeTooltip(node) {
    // make a tooltip showing counts of incoming and outgoing nodes.
    var ref = node.popperRef(); // used for positioning
    node.tippy = tippy(ref, {
        content: createNeighCountTable(node),
        trigger: "manual"
    })
}

function redoLayout(randomise) {
    layoutOptions.randomize = randomise;
    cy.layout(layoutOptions).run();
}

function getNeighbourStateCounts(node) {
    var counts = {}
    STATES.forEach(function (st, idx) {
        counts[st] = node.neighbourhood(`node[state="${st}"]`).length
    });
    return counts
}

function getOutNeighbourStateCounts(node) {
    var counts = {}
    STATES.forEach(function (st, idx) {
        counts[st] = node.outgoers().nodes(`node[state="${st}"]`).length
    });
    return counts
}

function getInNeighbourStateCounts(node) {
    var counts = {}
    STATES.forEach(function (st, idx) {
        counts[st] = node.incomers().nodes(`node[state="${st}"]`).length
    });
    return counts
}

function getDirectedNeighbourStateCounts(node) {
    var counts = {}
    counts['out'] = {}
    counts['in'] = {}
    STATES.forEach(function (st, idx) {
        counts['out'][st] = node.outgoers().nodes(`node[state="${st}"]`).length;
        counts['in'][st] = node.incomers().nodes(`node[state="${st}"]`).length;
    });
    //console.log('hello');
    return counts
}

function getNeighbourhoodCountVector(node) {
    // returns a NumJS array of [in_A, in_B,... out_A, out_B,... bias(1)]
    var counts = []
    STATES.forEach(function (st, idx) {
        counts.push(node.incomers().nodes(`node[state="${st}"]`).length);
    });
    STATES.forEach(function (st, idx) {
        counts.push(node.outgoers().nodes(`node[state="${st}"]`).length);
    });
    counts.push(1) // for bias
    var vec = nj.array(counts);
    return vec
}

function getNeighbourhoodLaplacianVector(node) {
    // returns a NumJS array of bidirectional Laplacian filtered counts (as in ALife paper)
    // ie. if the central node is in state A:
    // [in_deg(node)-in_A, -in_B,... out_deg(A)-out_A, -out_B,... bias(1)]
    var counts = []
    var in_deg = node.incomers().nodes().length;
    var out_deg = node.outgoers().nodes.length;
    var node_state = node.data('state');
    // first do incoming
    STATES.forEach(function (st, idx) {
        if (st == node_state) {
            counts.push(in_deg - node.incomers().nodes(`node[state="${st}"]`).length);
        } else {
            counts.push(-node.incomers().nodes(`node[state="${st}"]`).length);
        }
    });
    // then do outgoing
    STATES.forEach(function (st, idx) {
        if (st == node_state) {
            counts.push(out_deg - node.outgoers().nodes(`node[state="${st}"]`).length);
        } else {
            counts.push(-node.outgoers().nodes(`node[state="${st}"]`).length);
        }
    });
    counts.push(1) // for bias
    var vec = nj.array(counts);
    return vec
}

function dgcaStep() {
    // This calculates all the info to do a step but doesn't actually make the changes
    // (since we are looping through nodes assesing neighbourhoods etc. it would
    // get messed up if we were changing things as we went along)
    cy.data('prev', cy.json()); // Store previous state in the prev field
    var current_nodes = cy.nodes()
    var to_remove = [];
    var new_states = {};
    var split_flags = {};
    // first loop through current nodes and determine what action they should take.
    cy.startBatch();
    current_nodes.forEach(function (nd) {
        var nd_id = nd.data('id');
        var inp_vec = getNeighbourhoodLaplacianVector(nd);
        //RULE.shape.length === 2 && inp_vec.shape.length === 1 && RULE.shape[1] === inp_vec.shape[0]
        console.log(`matmul ${RULE.shape} x ${inp_vec.shape}, is ok? ${RULE.shape.length === 2 && inp_vec.shape.length === 1 && RULE.shape[1] === inp_vec.shape[0]}`);
        console.log(nj.dot(RULE, inp_vec));
        var out_vec = nj.tanh(nj.dot(RULE, inp_vec));
        if (VERSION == 'v2') {
            var result = argMax(out_vec);
            if (result < STATES.length) {
                // just change state
                new_states[nd_id] = STATES[result];
            } else if (result == STATES.length) {
                // remove node action (but only at end)
                //nd.data('deleting', 1);
                nd.addClass('deleting');
                to_remove.push(nd_id);
            } else if (result == (STATES.length + 1)) {
                //nd.data('splitting', 1);
                nd.addClass('splitting');
                split_flags[nd_id] = {};
                split_flags[nd_id]['n'] = 0;
                split_flags[nd_id]['lf'] = 2;
                split_flags[nd_id]['lb'] = 2;
            }
        } else if (VERSION == 'v3') {
            var action_choice = argMax(out_vec.slice([3]));
            if (action_choice == 0) {
                // remove node action (but only at end)
                //nd.data('deleting', 1);
                nd.addClass('deleting');
                to_remove.push(nd_id);
            } else if (action_choice == 1) {
                // node remains, just find new state
                new_states[nd_id] = STATES[argMax(out_vec.slice(-STATES.length))]; // argmax of last S items
            } else if (action_choice == 2) {
                // node splits. We need to work out split type
                //nd.data('splitting', 1);
                nd.addClass('splitting');
                split_flags[nd_id] = {};
                split_flags[nd_id]['n'] = argMax(out_vec.slice([3, 7]));
                split_flags[nd_id]['lf'] = argMax(out_vec.slice([7, 11]));
                split_flags[nd_id]['lb'] = argMax(out_vec.slice([11, 15]));
                // also find new state
                new_states[nd_id] = STATES[argMax(out_vec.slice(-STATES.length))]; // argmax of last S items
            } else {
                console.log("Something wrong!")
            };
        }

    });
    // console.log("To remove:");
    // console.log(to_remove);
    // console.log("New states:");
    // console.log(new_states);
    // console.log("Split flags:");
    // console.log(split_flags);

    // May as well actually do it in same function!
    TIMESTEP += 1;
    // CREATE NEW NODES
    // keep a ref to parent node (to make it easier to draw correct edges)
    var new_node_ids = [];
    // create dict from node_id to parent (node which divided to create them) and vice versa
    var node_parents = {};
    var node_children = {};
    var orig_incomers = {};
    var orig_outgoers = {};
    Object.keys(split_flags).forEach(nd_id => {
        //NB was adding the parent node as "parent: nd.data('id')" - this creates compound nodes,
        // and I thiiink automatically adds the "children" property to any node we have specified as a parent.
        //Now using the node_parents and node_children dicts instead, BUT compound nodes could actually be useful
        //for plotting (as an intermediate step showing new nodes being "born")
        // keep dicts of current node incomers and outgoers - needed when creating child edges
        var nd = cy.$id(nd_id);
        orig_incomers[nd_id] = nd.incomers('node');
        orig_outgoers[nd_id] = nd.outgoers('node');
        var orig_state = nd.data('state'); // new node gets orig node state
        parent_pos = nd.position();
        // I think the above is faster than the below.
        //orig_incomers[nd_id] = cy.nodes('#' + nd_id).incomers('node');
        //orig_outgoers[nd_id] = cy.nodes('#' + nd_id).outgoers('node');
        //var orig_state = cy.nodes('#' + nd_id).data('state'); // new node gets orig node state
        //parent_pos = cy.nodes('#' + nd_id).position();
        cy.add({ group: 'nodes', data: { id: next_node_id, state: orig_state }, position: { x: parent_pos.x + 1, y: parent_pos.y + 1 } });
        new_node_ids.push(next_node_id);
        node_parents[next_node_id] = nd_id;
        node_children[nd_id] = next_node_id;
        next_node_id += 1;
    });
    // LINK UP NEW NODES
    new_node_ids.forEach(child_id => {
        var parent_id = node_parents[child_id];
        //var parent_node = cy.nodes('#'+parent_id);
        // var child_node = cy.node(child_id);
        // var parent_node = child_node.data('parent');
        // var parent_id = parent_node.data('id');
        //var parent_incomers = parent_node.incomers('node');
        //var parent_outgoers = parent_node.outgoers('node');
        var parent_incomers = orig_incomers[parent_id];
        var parent_outgoers = orig_outgoers[parent_id];

        // deal with "link forward" - from existing to new
        var lf = split_flags[parent_id]['lf'];
        if (lf == 0) {
            // no link forward
        } else if (lf == 1) {
            // link from parent to child
            cy.add({ group: 'edges', data: { id: `${parent_id}->${child_id}`, source: parent_id, target: child_id } });
        } else if (lf == 2) {
            // link from parent incomers to child
            parent_incomers.forEach(src_node => {
                var src_id = src_node.data('id');
                cy.add({ group: 'edges', data: { id: `${src_id}->${child_id}`, source: src_id, target: child_id } });
            });
        } else if (lf == 3) {
            // link from parent outgoers to child
            parent_outgoers.forEach(src_node => {
                var src_id = src_node.data('id');
                cy.add({ group: 'edges', data: { id: `${src_id}->${child_id}`, source: src_id, target: child_id } });
            });
        } else {
            console.log("Something wrong!")
        };
        // deal with "link backwards" - from new to existing
        var lb = split_flags[parent_id]['lb'];
        if (lb == 0) {
            // no link backwards
        } else if (lb == 1) {
            // link from child to parent
            cy.add({ group: 'edges', data: { id: `${child_id}->${parent_id}`, source: child_id, target: parent_id } });
        } else if (lb == 2) {
            // link from child to parent outgoers
            parent_outgoers.forEach(target_node => {
                var target_id = target_node.data('id');
                cy.add({ group: 'edges', data: { id: `${child_id}->${target_id}`, source: child_id, target: target_id } });
            });
        } else if (lb == 3) {
            // link from child to parent incomers (transpose)
            parent_incomers.forEach(target_node => {
                var target_id = target_node.data('id');
                cy.add({ group: 'edges', data: { id: `${child_id}->${target_id}`, source: child_id, target: target_id } });
            });
        } else {
            console.log("Something wrong!")
        };
        // deal with "links new" (n) - amongst new nodes
        // TODO this can cause an error if two siblings both decide to make the same edge (in the same direction)
        // is it a flaw of thw
        var ln = split_flags[parent_id]['n'];
        if (ln == 0) {
            // no link
        } else if (ln == 1) {
            // link to self
            cy.add({ group: 'edges', data: { id: `${child_id}->${child_id}`, source: child_id, target: child_id } });
        } else if (ln == 2) {
            // links to the children of parent outgoers
            parent_outgoers.forEach(parout => {
                if (parout.data('id') in node_children) {
                    var target_id = node_children[parout.data('id')];
                    cy.add({ group: 'edges', data: { id: `${child_id}->${target_id}`, source: child_id, target: target_id } });
                }
            });
        } else if (ln == 3) {
            // links to the children of parent incomers
            parent_incomers.forEach(parin => {
                // the below loop won't be used if this parent incomer has no children
                if (parin.data('id') in node_children) {
                    var target_id = node_children[parin.data('id')];
                    cy.add({ group: 'edges', data: { id: `${child_id}->${target_id}`, source: child_id, target: target_id } });
                }
            });
        }
    });
    // CHANGE NODE STATES
    Object.entries(new_states).forEach(([nd_id, state]) => {
        cy.$id(nd_id).data('state', state);
    });
    cy.endBatch();
    if (anim_2step_checkbox.checked) {
        // do the layout before removing the deleted nodes so that we can fade them out.
        layoutOptions.randomize = false;
        var lay = cy.layout(layoutOptions);
        lay.promiseOn('layoutstop').then(evt => { // what to do once the layout has finished running (ie. run second step)
            // remove "splitting" indicator from nodes
            Object.keys(split_flags).forEach(nd_id => {
                //cy.$id(nd_id).data('splitting', 0);
                cy.$id(nd_id).removeClass('splitting');
            });
            // REMOVE DELETED NODES
            to_remove.forEach(nd_id => {
                cy.$id(nd_id).remove();
            });
            redoLayout(false);
        })
        lay.run(); // run first step
    } else {
        // remove "splitting" indicator from nodes
        Object.keys(split_flags).forEach(nd_id => {
            //cy.$id(nd_id).data('splitting', 0);
            cy.$id(nd_id).removeClass('splitting');
        });
        // REMOVE DELETED NODES
        to_remove.forEach(nd_id => {
            cy.$id(nd_id).remove();
        });
        redoLayout(false);
    }
    //refreshTooltips();
    refreshEvents();

}

function argMax(vec) {
    // NumJS doesn't seem to have argmax
    // got this from: https://gist.github.com/engelen/fbce4476c9e68c52ff7e5c2da5c24a28
    var array = vec.tolist() // convert to a native JS list.
    return array.map((x, i) => [x, i]).reduce((r, a) => (a[0] > r[0] ? a : r))[1];
}

// TODO: I wonder if I could do it all in one go as in the python code.
// Can I convert between cytoscape and adjacency matrix.
// Doesn't seem to be any cytoscape function to do this. Could write my own?

function stepForward() {
    if (('next' in cy.data()) && (cy.data('next') != null)) {
        //shortcut if we have already done a step back, we don't need to recalculate.
        console.log('Next step already calculated');
        // because cy.json(...) only updates the specified fields if the 'next' json has no 'next' field of its own
        // it will continue to reference *this* next json. So then we need to manually remove the field.
        console.log(cy.data());
        var has_next_next = (('next' in cy.data('next')) && (cy.data('next')['next'] != null));
        cy.json(cy.data('next'));
        if (!has_next_next) {
            cy.data('next', null);
        }
    } else {
        //console.log('Calculating next step');
        dgcaStep();
    }
    step_count_info.innerHTML = TIMESTEP;
    node_count_info.innerHTML = cy.nodes().length;
    component_count_info.innerHTML = cy.elements().components().length;
    cy.$('.component-selected').removeClass('component-selected');
}

function stepBack() {
    var next = cy.json(); // save current graph 
    cy.json(cy.data('prev')); // revert to previous step
    cy.data('next', next); // attach current graph in "next" attrib so we don't have to recalculate if we step forward.
    cy.nodes().forEach(nd => {
        //nd.data('splitting', 0);
        //nd.data('deleting', 0);
        nd.removeClass('splitting');
        nd.removeClass('deleting');
    });
    redoLayout(false);
    step_count_info.innerHTML = TIMESTEP;
    node_count_info.innerHTML = cy.nodes().length;
    component_count_info.innerHTML = cy.elements().components().length;
    cy.$('.component-selected').removeClass('component-selected');
}

var running = false;
var runloop;
function toggleRun() {
    if (running) {
        clearInterval(runloop);
        play_pause_btn.innerHTML = '<i class="material-icons">play_arrow</i>';
    } else {
        runloop = setInterval(stepForward, step_pause);
        play_pause_btn.innerHTML = '<i class="material-icons">pause</i>';
    }
    running = !running;
}

function saveImage() {
    saveAs(cy.png(), `dgca_${run_timestamp}_step${TIMESTEP}.png`);
}

function getTimestamp() {
    // From https://stackoverflow.com/questions/19448436/how-to-create-date-in-yyyymmddhhmmss-format-using-javascript
    function pad2(n) { return n < 10 ? '0' + n : n }
    var date = new Date();
    return date.getFullYear().toString() + pad2(date.getMonth() + 1) + pad2( date.getDate()) + pad2( date.getHours() ) + pad2( date.getMinutes() ) + pad2( date.getSeconds() );
}

function setSelfLoopStyle(style) {
    //console.log(style);
    // Change the JSON stylesheet, then apply it.
    cy_style.forEach((elem) => {
        // find the edge:loop part of the stylesheet
        if (elem.selector=="edge:loop") {
            if (style=="big-selfloops") {
                elem.style = {'curve-style': 'bezier'};
            } else if (style=="small-selfloops") {
                elem.style = {'curve-style': 'haystack'};
            }
        }
    });
    //console.log(cy_style);
    cy.style(cy_style).update;
}

function isolateComponent() {
    //Removes all but the selected components
    //cy.remove('.component-selected');
    cy.remove(
        // To negate a class I think we have to do the rather verbose:
        cy.elements().not(cy.$('.component-selected'))
    )
    cy.$('.component-selected').removeClass('component-selected');
}

function newWindow() {
    //https://stackoverflow.com/questions/1830347/quickest-way-to-pass-data-to-a-popup-window-i-created-using-window-open
    var new_window = window.open(window.location.href);
    var eles_json = cy.$('.component-selected').jsons();
    // new_window.passed = {
    //     'rule': RULE,
    //     'cy_eles': eles_json,
    //     'num_states': NUMSTATES,
    //     'version': VERSION,
    //     'seed_graph_name': seed_graph_dropdown.value,
    //     'next_node_id': next_node_id // so that we don't have to reassign ids
    // };
    new_window.passed = JSON.stringify({ version: VERSION, num_states: NUMSTATES, rule: RULE, seed_graph: eles_json, next_node_id: next_node_id });
}

function createSLPDiagram() {
    var nodes = [];
    var edges = [];
    for (let i=0; i<NUMSTATES; i++) {
        nodes.push({data: {id: ALLSTATES[i]+'_in',  value: 0, row: i, col: 0}});
        nodes.push({data: {id: ALLSTATES[i]+'_out', value: 0, row: i+NUMSTATES, col: 0}});
        nodes.push({data: {id: 'State'+ALLSTATES[i], value: 0, row: i, col: 1}});
    }
    // For v2
    nodes.push({data: {id: 'bias', value: 0, row: NUMSTATES*2, col: 0}});
    nodes.push({data: {id: 'Keep', value: 0, row: NUMSTATES, col: 1}});
    nodes.push({data: {id: 'Remove', value: 0, row: NUMSTATES+1, col: 1}});
    nodes.push({data: {id: 'Divide', value: 0, row: NUMSTATES+2, col: 1}});
    return {nodes: nodes, edges: edges};
}

// Add neural net diagram in side panel
var slp = {
    nodes: [
        { data: { id: 'A_in', value: 0, x:0, y:0} },
        { data: { id: 'B_in', value: 0, x:0, y:1 } },
        { data: { id: 'A_out', value: 0, x:0, y:2 } },
        { data: { id: 'B_out', value: 0, x:0, y:3} },

        { data: { id: 'StateA', value: 0, x:1, y:0} },
        { data: { id: 'StateB', value: 0, x:1, y:1 } },
        { data: { id: 'Keep', value: 0, x:1, y:2 } },
        { data: { id: 'Remove', value: 0, x:1, y:3 } },
        { data: { id: 'Divide', value: 0, x:1, y:4 } },
    ],
    edges: [
        { data: { id: '0,0', source: 'A_in', target: 'StateA' } },
        { data: { id: '0,1', source: 'A_in', target: 'StateB' } },
        { data: { id: '0,2', source: 'A_in', target: 'Keep' } },
        { data: { id: '0,3', source: 'A_in', target: 'Remove' } },
        { data: { id: '0,4', source: 'A_in', target: 'Divide' } },
        { data: { id: '1,0', source: 'B_in', target: 'StateA' } },
        { data: { id: '1,1', source: 'B_in', target: 'StateB' } },
        { data: { id: '1,2', source: 'B_in', target: 'Keep' } },
        { data: { id: '1,3', source: 'B_in', target: 'Remove' } },
        { data: { id: '1,4', source: 'B_in', target: 'Divide' } }
    ]
}
var cy_nn = cytoscape({

    container: document.getElementById('cy-nn'), // container to render in

    elements: slp,

    style: [ // the stylesheet for the graph
        {
        selector: 'node',
        style: {
            'background-color': '#666',
            'label': 'data(id)',
            'color': 'white',
            'width':  6,
            'height': 6
        }
        },

        {
        selector: 'edge',
        style: {
            'width': 1,
            'line-color': '#ccc',
            'target-arrow-color': '#ccc',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier'
        }
        }
    ],

    layout: {
        name: 'grid',
        rows: 5,
        cols: 2,
        position: function(nd) {return {'row': nd.data('y'), 'col': nd.data('x')}}
    }

});
