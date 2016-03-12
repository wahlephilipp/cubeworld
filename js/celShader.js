/**
 * http://www.realtimerendering.com/erich/udacity/exercises/unit3_toon_solution3.html
 *
 * @type {{phongDiffuse: {uniforms: {uDirLightPos: {type: string, value: THREE.Vector3}, uDirLightColor: {type: string, value: THREE.Color}, uMaterialColor: {type: string, value: THREE.Color}, uKd: {type: string, value: number}, uBorder: {type: string, value: number}}, vertexShader: string, fragmentShader: string}}}
 */
THREE.ShaderTypes = {

    'phongDiffuse' : {

        uniforms: {

            "uDirLightPos":	{ type: "v3", value: new THREE.Vector3() },
            "uDirLightColor": { type: "c", value: new THREE.Color( 0xffffff ) },

            "uMaterialColor":  { type: "c", value: new THREE.Color( 0xffffff ) },

            uKd: {
                type: "f",
                value: 0.7
            },
            uBorder: {
                type: "f",
                value: 0.4
            }
        },

        vertexShader: [

            "varying vec3 vNormal;",
            "varying vec3 vViewPosition;",

            "void main() {",

            "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
            "vNormal = normalize( normalMatrix * normal );",
            "vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
            "vViewPosition = -mvPosition.xyz;",

            "}"

        ].join("\n"),

        fragmentShader: [

            "uniform vec3 uMaterialColor;",

            "uniform vec3 uDirLightPos;",
            "uniform vec3 uDirLightColor;",

            "uniform float uKd;",
            "uniform float uBorder;",

            "varying vec3 vNormal;",
            "varying vec3 vViewPosition;",

            "void main() {",

            // compute direction to light
            "vec4 lDirection = viewMatrix * vec4( uDirLightPos, 0.0 );",
            "vec3 lVector = normalize( lDirection.xyz );",

            // diffuse: N * L. Normal must be normalized, since it's interpolated.
            "vec3 normal = normalize( vNormal );",
            //was: "float diffuse = max( dot( normal, lVector ), 0.0);",
            // solution
            "float diffuse = dot( normal, lVector );",
            "if ( diffuse > 0.6 ) { diffuse = 1.0; }",
            "else if ( diffuse > -0.2 ) { diffuse = 0.7; }",
            "else { diffuse = 0.3; }",

            "gl_FragColor = vec4( uKd * uMaterialColor * uDirLightColor * diffuse, 1.0 );",

            "}"

        ].join("\n")

    }

};