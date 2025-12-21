package catalog

import (
	"testing"
)

func TestParser_Parse(t *testing.T) {
	// Simplified Dell catalog XML structure
	xmlData := []byte(`<?xml version="1.0" encoding="utf-8"?>
<Manifest version="2.0">
	<SoftwareComponent schemaVersion="2.0" packageID="ABCD1234" releaseDate="2024-01-15"
		vendorVersion="2.19.1" path="FOLDER123/BIOS_ABC.EXE" size="16777216">
		<Name><Display>BIOS Update</Display></Name>
		<ComponentType value="BIOS"/>
		<Criticality value="Recommended"/>
		<SupportedSystems>
			<Brand>
				<Model systemID="08B4" systemIDType="PNPID">PowerEdge R640</Model>
			</Brand>
		</SupportedSystems>
	</SoftwareComponent>
	<SoftwareComponent schemaVersion="2.0" packageID="EFGH5678" releaseDate="2024-02-20"
		vendorVersion="6.10.30.00" path="FOLDER456/iDRAC_XYZ.EXE" size="33554432">
		<Name><Display>iDRAC Update</Display></Name>
		<ComponentType value="FRMW"/>
		<Criticality value="Critical"/>
		<SupportedSystems>
			<Brand>
				<Model systemID="08B4" systemIDType="PNPID">PowerEdge R640</Model>
			</Brand>
		</SupportedSystems>
	</SoftwareComponent>
</Manifest>`)

	parser := NewParser()
	entries, err := parser.Parse(xmlData)
	if err != nil {
		t.Fatalf("parse error: %v", err)
	}

	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}

	// Check BIOS entry
	bios := entries[0]
	if bios.Version != "2.19.1" {
		t.Errorf("expected BIOS version 2.19.1, got %s", bios.Version)
	}
	if bios.Criticality != "Recommended" {
		t.Errorf("expected criticality Recommended, got %s", bios.Criticality)
	}
}

func TestParser_EmptyManifest(t *testing.T) {
	xmlData := []byte(`<?xml version="1.0"?><Manifest version="2.0"></Manifest>`)

	parser := NewParser()
	entries, err := parser.Parse(xmlData)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(entries) != 0 {
		t.Errorf("expected 0 entries, got %d", len(entries))
	}
}
